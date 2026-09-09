import { cacheKeyOf, type IntentClass } from "./cache-key.ts";
import type { CacheStore } from "./cache-store.ts";
import { candidates } from "./candidates.ts";
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
}

export interface ComposeInput {
  readonly candidates: readonly ComponentContract[];
  readonly shape: ShapeDescriptor;
  readonly intentClass: IntentClass;
}

/** core 不绑定任何 provider SDK，LLM 能力由构造时注入。 */
export interface LLMClient {
  composeSurface(input: ComposeInput): Promise<SurfaceTemplate>;
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

export interface DegradeReason {
  readonly stage: "validation";
  readonly errors: readonly ValidationError[];
}

export interface CompileResult {
  readonly surface: SurfaceTemplate | null;
  readonly source: "L0" | "L2" | "gap" | "fallback";
  readonly templateId: string | null;
  readonly capabilityGap: CapabilityGap | null;
  readonly degraded: DegradeReason | null;
}

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
      return {
        surface: cached.template,
        source: "L0",
        templateId: cached.templateId,
        capabilityGap: null,
        degraded: null,
      };
    }

    // 候选集必须先算：为空说明 catalog 拿不下这份数据，此时调用模型纯属浪费——
    // 它只会编出引用不存在组件的产物。直接上报 gap。
    const matched = candidates(request.catalog.components, shape);
    if (matched.length === 0) {
      return {
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
    const outcome = await this.#singleflight.run(key, async () => {
      const template = await this.#llm.composeSurface({
        candidates: matched,
        shape,
        intentClass: request.intentClass,
      });

      // 验证不通过绝不入缓存：一次坏产物若被晋升，会在这个 key 上被永久复用。
      const errors = validateTemplate(template, {
        components: request.catalog.components,
        shape,
      });
      if (errors.length > 0) return { ok: false as const, errors };

      const entry = { templateId: key, template };
      // JIT 晋升：L2 产物回写 L0，下次同意图即 0 次模型调用。
      await this.#cache.set(key, entry);
      return { ok: true as const, entry };
    });

    if (!outcome.ok) {
      return {
        surface: null,
        source: "fallback",
        templateId: null,
        capabilityGap: null,
        degraded: { stage: "validation", errors: outcome.errors },
      };
    }

    return {
      surface: outcome.entry.template,
      source: "L2",
      templateId: outcome.entry.templateId,
      capabilityGap: null,
      degraded: null,
    };
  }
}
