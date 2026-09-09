import { describe, expect, test } from "bun:test";
import type { ComponentContract } from "@next-a2ui/core";
import { describeShape } from "@next-a2ui/core";
import { MockLanguageModelV2 } from "ai/test";
import { createAISDKClient } from "../src/client.ts";

const movieList: ComponentContract = {
  id: "MovieList",
  dataProp: "movies",
  accepts: { type: "array", items: { type: "object", required: ["title"] } },
  emits: [{ name: "select" }, { name: "play" }],
  semantics: { use: "影片行列表", avoid: "" },
  density: "compact",
};

const model = new MockLanguageModelV2({
  doGenerate: async () => ({
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ components: [{ id: "a", component: "MovieList" }] }),
      },
    ],
    finishReason: "stop" as const,
    usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    warnings: [],
  }),
});

describe("交互声明由契约推导", () => {
  test("契约的每个 emits 都变成一个 A2UI Action", async () => {
    const client = createAISDKClient({ model });

    const template = await client.composeSurface({
      candidates: [movieList],
      shape: describeShape([{ id: 1, title: "沙丘" }]),
      intentClass: "browse",
    });

    expect(template.components[0]?.actions).toEqual({
      select: { event: { name: "select" } },
      play: { event: { name: "play" } },
    });
  });
});
