import { describe, expect, test } from "bun:test";
import { describeShape } from "@next-a2ui/core";
import { MockLanguageModelV2 } from "ai/test";
import { createIntentClassifier } from "../src/intent.ts";

const input = {
  userQuery: "帮我找 2024 年之后评分高的科幻片",
  toolCall: { name: "getMovies", args: { genre: "sci-fi", yearGte: 2024 } },
  shape: describeShape([{ id: 1, title: "沙丘", poster: "/p.jpg" }]),
};

function modelReturning(payload: unknown) {
  return new MockLanguageModelV2({
    doGenerate: async () => ({
      content: [{ type: "text" as const, text: JSON.stringify(payload) }],
      finishReason: "stop" as const,
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      warnings: [],
    }),
  });
}

describe("createIntentClassifier", () => {
  test("返回模型判定的意图", async () => {
    const classifier = createIntentClassifier({ model: modelReturning({ intentClass: "filter" }) });

    const result = await classifier.classify(input);

    expect(result).toEqual({ intentClass: "filter", degraded: false });
  });

  test("小模型失败时回退到默认意图而不是抛出", async () => {
    const failing = new MockLanguageModelV2({
      doGenerate: async () => {
        throw new Error("ollama 连不上");
      },
    });
    const classifier = createIntentClassifier({ model: failing, fallback: "browse" });

    const result = await classifier.classify(input);

    expect(result).toEqual({ intentClass: "browse", degraded: true });
  });
});
