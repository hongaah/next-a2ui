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
    .enum(["browse", "detail", "compare", "filter", "act", "confirm", "edit", "explain"])
    .describe(
      [
        "界面意图：",
        "browse=浏览发现；detail=只想了解某一项的信息；compare=并排对比；",
        "filter=筛选后看结果；act=想执行操作（播放/打开/加入/删除）而不只是查看；",
        "confirm=确认操作；edit=修改数据；explain=解释说明",
      ].join(""),
    ),
});

function describeData(shape: ShapeDescriptor): string {
  switch (shape.kind) {
    case "array":
      return `${shape.lengthBucket} 条列表`;
    case "object":
      return "单个对象";
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
          // 这是唯一每个请求都要跑的模型调用，提示长度直接决定它的延迟——但
          // 压过头会让分类不稳定，而**不稳定比慢更糟**：它同时让缓存碎片化和
          // 动作选错。类别语义必须写在正文里，数据描述可以压到最短。
          prompt: [
            `用户说：${input.userQuery}`,
            `应用调用：${input.toolCall.name}(${Object.keys(input.toolCall.args).join(",")}) → ${describeData(input.shape)}`,
            "",
            "判断用户想要什么样的界面，只输出类别：",
            "act — 想执行操作（播放、打开、加入、删除）。用户说「放」「看」「播」时属于这类",
            "detail — 只想了解某一项的信息，没有执行意向",
            "browse — 泛泛浏览发现",
            "filter — 按条件筛选后看结果",
            "compare — 并排对比多项",
            "confirm — 确认某个操作 · edit — 修改数据 · explain — 解释说明",
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
