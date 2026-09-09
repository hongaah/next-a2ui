import type { A2UIComponent, ActionPlan, LLMClient, SurfaceTemplate } from "@next-a2ui/core";
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
        schema: buildSurfaceSchema(input.candidates, input.shape),
        prompt: surfacePrompt(input),
      });
      const components = object.components as readonly A2UIComponent[];
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
