import type { ActionContract, ActionInvocation, ActionPlan } from "./action.ts";
import { bindActionPlan } from "./bind-action.ts";
import { cacheKeyOf, type IntentClass } from "./cache-key.ts";
import type { CachedPlan, CacheStore } from "./cache-store.ts";
import { actionCandidates, candidates } from "./candidates.ts";
import type { ComponentContract } from "./contract.ts";
import { describeShape, type ShapeDescriptor, serializeShape } from "./data-shape.ts";
import { Singleflight } from "./singleflight.ts";
import type { SurfaceTemplate } from "./surface.ts";
import { type ToolCall, toolSignature } from "./tool-signature.ts";
import { type ValidationError, validateTemplate } from "./validate-template.ts";

export interface Catalog {
  readonly id: string;
  readonly version: string;
  readonly components: readonly ComponentContract[];
  readonly actions?: readonly ActionContract[];
}

export interface ComposeInput {
  readonly candidates: readonly ComponentContract[];
  readonly shape: ShapeDescriptor;
  readonly intentClass: IntentClass;
}

export interface PlanActionsInput {
  readonly candidates: readonly ActionContract[];
  readonly availableArgs: readonly string[];
  readonly intentClass: IntentClass;
}

/** core 不绑定任何 provider SDK，LLM 能力由构造时注入。 */
export interface LLMClient {
  composeSurface(input: ComposeInput): Promise<SurfaceTemplate>;
  planActions(input: PlanActionsInput): Promise<readonly ActionPlan[]>;
}

export interface CompileRequest {
  readonly toolCall: ToolCall;
  readonly data: unknown;
  readonly intentClass: IntentClass;
  readonly catalog: Catalog;
  readonly variantId?: string;
  readonly flowContext?: string | null;
}

/**
 * 编译不出来的记录。没有它，JIT 晋升的反馈回路是断的——
 * 你不知道 catalog 该往哪长。这是本引擎不做 open-ended 生成的前提条件。
 */
export interface CapabilityGap {
  readonly cacheKey: string;
  readonly reason: "no-candidates";
  readonly dataShape: string;
  readonly intentClass: IntentClass;
}

export type DegradeReason =
  | { readonly stage: "validation"; readonly errors: readonly ValidationError[] }
  | { readonly stage: "compile-error"; readonly message: string };

export interface CompileResult {
  /** 阶梯 1：驱动宿主现有 UI 的动作。 */
  readonly actions: readonly ActionInvocation[];
  /** 阶梯 2+：生成的界面。action-only 场景下为 null。 */
  readonly surface: SurfaceTemplate | null;
  readonly source: "L0" | "L2" | "gap" | "fallback";
  readonly templateId: string | null;
  readonly capabilityGap: CapabilityGap | null;
  readonly degraded: DegradeReason | null;
}

type Outcome =
  | { readonly ok: true; readonly entry: CachedPlan }
  | { readonly ok: false; readonly errors: readonly ValidationError[] };

export class Compiler {
  readonly #cache: CacheStore;
  readonly #llm: LLMClient;
  readonly #singleflight = new Singleflight();

  constructor(options: { cache: CacheStore; llm: LLMClient }) {
    this.#cache = options.cache;
    this.#llm = options.llm;
  }

  async compile(request: CompileRequest): Promise<CompileResult> {
    const shape = describeShape(request.data);
    const key = cacheKeyOf({
      toolSig: toolSignature(request.toolCall),
      dataShape: serializeShape(shape),
      intentClass: request.intentClass,
      variantId: request.variantId ?? "default",
      flowContext: request.flowContext ?? null,
      catalogId: request.catalog.id,
      catalogVersion: request.catalog.version,
    });

    const cached = await this.#cache.get(key);
    if (cached !== undefined) {
      return this.#succeed(cached, request, "L0");
    }

    // 候选集必须先算：为空说明 catalog 既拿不下这份数据、也没有可驱动的动作，
    // 此时调用模型纯属浪费——它只会编出引用不存在组件的产物。直接上报 gap。
    const availableArgs = Object.keys(request.toolCall.args);
    const componentMatches = candidates(request.catalog.components, shape);
    const actionMatches = actionCandidates(request.catalog.actions ?? [], availableArgs);

    // 组件无候选但动作有候选是 action-only 场景（阶梯 1），不是 gap。
    if (componentMatches.length === 0 && actionMatches.length === 0) {
      return {
        actions: [],
        surface: null,
        source: "gap",
        templateId: null,
        capabilityGap: {
          cacheKey: key,
          reason: "no-candidates",
          dataShape: serializeShape(shape),
          intentClass: request.intentClass,
        },
        degraded: null,
      };
    }

    // 未命中走 L2，并在 singleflight 保护下编译：同一 key 的并发请求只付一次钱。
    let outcome: Outcome;
    try {
      outcome = await this.#singleflight.run<Outcome>(key, async () => {
        const [template, actionPlans] = await Promise.all([
          componentMatches.length === 0
            ? null
            : this.#llm.composeSurface({
                candidates: componentMatches,
                shape,
                intentClass: request.intentClass,
              }),
          actionMatches.length === 0
            ? []
            : this.#llm.planActions({
                candidates: actionMatches,
                availableArgs,
                intentClass: request.intentClass,
              }),
        ]);

        // 验证不通过绝不入缓存：一次坏产物若被晋升，会在这个 key 上被永久复用。
        const errors =
          template === null
            ? []
            : validateTemplate(template, { components: request.catalog.components, shape });
        if (errors.length > 0) return { ok: false, errors };

        const entry: CachedPlan = { templateId: key, template, actionPlans };
        // JIT 晋升：L2 产物回写 L0，下次同意图即 0 次模型调用。
        await this.#cache.set(key, entry);
        return { ok: true, entry };
      });
    } catch (error) {
      // compile 永不抛出：一个 slot 编译失败不能让宿主页面挂掉。
      // 失败不写缓存，所以下一次请求会自然重试。
      return {
        actions: [],
        surface: null,
        source: "fallback",
        templateId: null,
        capabilityGap: null,
        degraded: {
          stage: "compile-error",
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }

    if (!outcome.ok) {
      return {
        actions: [],
        surface: null,
        source: "fallback",
        templateId: null,
        capabilityGap: null,
        degraded: { stage: "validation", errors: outcome.errors },
      };
    }

    return this.#succeed(outcome.entry, request, "L2");
  }

  /**
   * 动作参数在**每一次**编译时重新绑定，缓存里存的只是无实参的计划。
   * 因此同一个缓存条目可以服务不同的参数：命中 L0 时参数依然来自本次
   * tool 调用，永远与 agent 的意图一致，且不花一个 token。
   */
  #succeed(entry: CachedPlan, request: CompileRequest, source: "L0" | "L2"): CompileResult {
    const contracts = new Map(
      (request.catalog.actions ?? []).map((action) => [action.id, action] as const),
    );
    const actions: ActionInvocation[] = [];
    for (const plan of entry.actionPlans) {
      const contract = contracts.get(plan.actionId);
      if (contract !== undefined) {
        actions.push(bindActionPlan(plan, contract, request.toolCall.args));
      }
    }

    return {
      actions,
      surface: entry.template,
      source,
      templateId: entry.templateId,
      capabilityGap: null,
      degraded: null,
    };
  }
}
