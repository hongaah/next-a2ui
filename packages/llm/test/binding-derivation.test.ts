import { describe, expect, test } from "bun:test";
import type { ComponentContract } from "@next-a2ui/core";
import { describeShape } from "@next-a2ui/core";
import { MockLanguageModelV2 } from "ai/test";
import { createAISDKClient } from "../src/client.ts";
import { buildSurfaceSchema } from "../src/schema.ts";

const movieList: ComponentContract = {
  id: "MovieList",
  dataProp: "movies",
  accepts: { type: "array", items: { type: "object", required: ["title"] } },
  emits: [{ name: "select" }],
  semantics: { use: "信息密集的影片行列表", avoid: "" },
  density: "compact",
};

const shape = describeShape([{ id: 1, title: "沙丘" }]);

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

describe("数据绑定由契约推导", () => {
  test("schema 里没有 bindings 字段", () => {
    const result = buildSurfaceSchema([movieList]).safeParse({
      components: [{ id: "a", component: "MovieList" }],
    });

    expect(result.success).toBe(true);
  });

  test("绑定用契约声明的数据 prop 名，指向整份数据", async () => {
    const client = createAISDKClient({
      model: modelReturning({ components: [{ id: "a", component: "MovieList" }] }),
    });

    const template = await client.composeSurface({
      candidates: [movieList],
      shape,
      intentClass: "browse",
    });

    // 不是模型现编的 `data`，也不是标量字段 `title`
    expect(template.components[0]?.bindings).toEqual({ movies: { path: "/" } });
  });
});
