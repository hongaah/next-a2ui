import { describe, expect, test } from "bun:test";
import type { ComponentContract } from "@next-a2ui/core";
import { describeShape } from "@next-a2ui/core";
import { MockLanguageModelV2 } from "ai/test";
import { createAISDKClient } from "../src/client.ts";
import { buildSurfaceSchema } from "../src/schema.ts";

const contract = (id: string): ComponentContract => ({
  id,
  dataProp: "movies",
  accepts: { type: "array", items: { type: "object", required: ["title"] } },
  emits: [],
  semantics: { use: id, avoid: "" },
  density: "normal",
});

// 有嵌套就必须有容器：没有容器组件时 schema 不含 children，模型无从嵌套
const candidates = [{ ...contract("MovieGrid"), acceptsChildren: true }, contract("MovieList")];
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

describe("rootId 不由模型给出", () => {
  test("schema 里没有 rootId 字段", () => {
    const shapeOfSchema = buildSurfaceSchema(candidates);

    const result = shapeOfSchema.safeParse({
      components: [{ id: "a", component: "MovieGrid" }],
    });

    expect(result.success).toBe(true);
  });

  test("从组件树推导根：没有被任何节点引用为子节点的那个", async () => {
    const client = createAISDKClient({
      model: modelReturning({
        components: [
          { id: "list", component: "MovieList" },
          { id: "shell", component: "MovieGrid", children: ["list"] },
        ],
      }),
    });

    const template = await client.composeSurface({ candidates, shape, intentClass: "browse" });

    expect(template.rootId).toBe("shell");
  });

  test("模型只给单个节点时，该节点就是根", async () => {
    const client = createAISDKClient({
      model: modelReturning({ components: [{ id: "only", component: "MovieGrid" }] }),
    });

    const template = await client.composeSurface({ candidates, shape, intentClass: "browse" });

    expect(template.rootId).toBe("only");
  });
});
