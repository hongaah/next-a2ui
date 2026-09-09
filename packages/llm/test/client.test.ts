import { describe, expect, test } from "bun:test";
import type { ComponentContract } from "@next-a2ui/core";
import { describeShape } from "@next-a2ui/core";
import { MockLanguageModelV2 } from "ai/test";
import { createAISDKClient } from "../src/client.ts";

const movieGrid: ComponentContract = {
  id: "MovieGrid",
  dataProp: "movies",
  accepts: { type: "array", items: { type: "object", required: ["title", "poster"] } },
  emits: [{ name: "select" }],
  semantics: { use: "封面优先的影片网格，适合浏览与发现", avoid: "缺封面时不要用" },
  density: "rich",
};

const shape = describeShape([{ id: 1, title: "沙丘", poster: "/p.jpg" }]);

function modelReturning(payload: unknown) {
  return new MockLanguageModelV2({
    doGenerate: async () => ({
      content: [{ type: "text" as const, text: JSON.stringify(payload) }],
      finishReason: "stop" as const,
      usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      warnings: [],
    }),
  });
}

describe("createAISDKClient composeSurface", () => {
  test("返回模型产出的模板", async () => {
    const client = createAISDKClient({
      model: modelReturning({
        components: [{ id: "root", component: "MovieGrid", bindings: { movies: { path: "/" } } }],
      }),
    });

    const template = await client.composeSurface({
      candidates: [movieGrid],
      shape,
      intentClass: "browse",
    });

    expect(template).toEqual({
      rootId: "root",
      components: [{ id: "root", component: "MovieGrid", bindings: { movies: { path: "/" } } }],
    });
  });
});
