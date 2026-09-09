import type { IntentClass, ShapeDescriptor, ToolCall } from "@next-a2ui/core";
import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";

export interface IntentInput {
  readonly userQuery: string;
  readonly toolCall: ToolCall;
  readonly shape: ShapeDescriptor;
}

export interface IntentResult {
  readonly intentClass: IntentClass;
  readonly degraded: boolean;
}

const INTENT_SCHEMA = z.object({
  intentClass: z
    .enum(["browse", "detail", "compare", "filter", "confirm", "edit", "explain"])
    .describe("这次请求属于哪一类界面意图"),
});

function describeData(shape: ShapeDescriptor): string {
  switch (shape.kind) {
    case "array":
      return `数组，长度区间 ${shape.lengthBucket}，元素字段：${shape.fields.join("、") || "（无）"}`;
    case "object":
      return `单个对象，字段：${shape.fields.join("、") || "（无）"}`;
    case "scalar":
      return `${shape.type} 标量`;
  }
}

/**
 * 意图分类器。
 *
 * 这是编译链路里唯一**每个请求都要跑**的模型调用，所以它必须极小极快——
 * 7 选 1、约 10 token 输出，跑本地小模型（qwen3:1.7b）即可，零成本零网络。
 * 大模型只在缓存未命中时才被叫醒。
 *
 * 输出用 z.enum 约束：小模型在自由生成上不可靠，但在受约束解码下只能吐出
 * 这七个词之一。
 */
export function createIntentClassifier(options: { model: LanguageModel; fallback?: IntentClass }): {
  classify(input: IntentInput): Promise<IntentResult>;
} {
  const fallback = options.fallback ?? "browse";

  return {
    async classify(input: IntentInput): Promise<IntentResult> {
      try {
        const { object } = await generateObject({
          model: options.model,
          schema: INTENT_SCHEMA,
          prompt: [
            "判断用户这次请求想要什么样的界面。只输出类别，不要解释。",
            "",
            `用户说：${input.userQuery}`,
            `应用调用了：${input.toolCall.name}(${Object.keys(input.toolCall.args).join(", ")})`,
            `返回数据：${describeData(input.shape)}`,
            "",
            "类别含义：",
            "browse 浏览发现 · detail 查看单项详情 · compare 并排对比",
            "filter 筛选后看结果 · confirm 确认操作 · edit 修改数据 · explain 解释说明",
          ].join("\n"),
        });
        return { intentClass: object.intentClass, degraded: false };
      } catch {
        // 分类失败不能阻断整条链路：退到默认意图照常编译，并标记降级。
        // 最坏结果是界面不够贴合，而不是没有界面。
        return { intentClass: fallback, degraded: true };
      }
    },
  };
}
