import type {
  A2UIComponent,
  ActionPlan,
  ComponentAction,
  ComponentContract,
  LLMClient,
  SurfaceTemplate,
} from "@next-a2ui/core";
import { generateObject, type LanguageModel } from "ai";
import { actionPrompt, surfacePrompt } from "./prompt.ts";
import { buildActionPlanSchema, buildSurfaceSchema } from "./schema.ts";

/**
 * 推导根节点：没有被任何节点引用为子节点的那个。
 *
 * 多个未被引用的节点时取第一个（其余是游离节点，属质量问题不属正确性问题）；
 * 全被引用（成环）时退到第一个，交给验证器兜住。
 */
function deriveRootId(components: readonly A2UIComponent[]): string {
  const referenced = new Set(components.flatMap((node) => node.children ?? []));
  const root = components.find((node) => !referenced.has(node.id));
  return root?.id ?? components[0]?.id ?? "";
}

/**
 * 按契约推导数据绑定。
 *
 * 契约已经声明了哪个 prop 承载数据，绑定因此是确定的：整份数据接到那个 prop。
 * 交给模型去选只会得到 `{ data: { path: "title" } }` 这种既不是真 prop 名、
 * 又把数组绑到标量字段的产物。能算出来的就别问模型。
 */
function withDataBinding(
  components: readonly A2UIComponent[],
  candidates: readonly ComponentContract[],
): A2UIComponent[] {
  const contracts = new Map(candidates.map((c) => [c.id, c] as const));
  return components.map((node) => {
    const contract = contracts.get(node.component);
    if (contract === undefined) return node;

    // 交互声明同样由契约推导：契约的每个 emits 就是一个可派发给 agent 的事件。
    // 这是 A2UI 的回路起点——用户点了卡片，事件要回到 agent，agent 再给出新界面。
    const actions: Record<string, ComponentAction> = {};
    for (const emit of contract.emits) {
      actions[emit.name] = { event: { name: emit.name } };
    }

    return {
      ...node,
      bindings: { [contract.dataProp]: { path: "/" } },
      ...(contract.emits.length === 0 ? {} : { actions }),
    };
  });
}

/**
 * LLMClient 的 Vercel AI SDK 实现。
 *
 * 只用 AI SDK 的结构化生成与 provider 抽象，不碰它的 generative UI——那是竞品面。
 * 配合 provider 原生 strict mode，schema 在解码时就是语法约束。
 */
export function createAISDKClient(options: { model: LanguageModel }): LLMClient {
  return {
    async composeSurface(input): Promise<SurfaceTemplate> {
      const { object } = await generateObject({
        model: options.model,
        schema: buildSurfaceSchema(input.candidates),
        prompt: surfacePrompt(input),
      });
      const components = withDataBinding(
        object.components as readonly A2UIComponent[],
        input.candidates,
      );
      return { rootId: deriveRootId(components), components };
    },

    async planActions(input): Promise<readonly ActionPlan[]> {
      const { object } = await generateObject({
        model: options.model,
        schema: buildActionPlanSchema(input.candidates, input.availableArgs),
        prompt: actionPrompt(input),
      });
      return object.plans;
    },
  };
}
