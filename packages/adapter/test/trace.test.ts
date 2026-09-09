import { describe, expect, test } from "bun:test";
import type { ActionPlan, Catalog, ComponentContract, LLMClient } from "@next-a2ui/core";
import { Compiler, MemoryCacheStore } from "@next-a2ui/core";
import { createCompileMiddleware } from "../src/middleware.ts";

const movieList: ComponentContract = {
  id: "MovieList",
  dataProp: "movies",
  accepts: { type: "array", items: { type: "object", required: ["title"] } },
  emits: [{ name: "select" }],
  semantics: { use: "影片行列表", avoid: "" },
  density: "compact",
};

const catalog: Catalog = { id: "movie-web", version: "1.0.0", components: [movieList] };

const llm: LLMClient = {
  composeSurface: async () => ({
    rootId: "root",
    components: [{ id: "root", component: "MovieList" }],
  }),
  planActions: async (): Promise<readonly ActionPlan[]> => [],
};

function middleware() {
  return createCompileMiddleware({
    compiler: new Compiler({ cache: new MemoryCacheStore(), llm }),
    classifier: { classify: async () => ({ intentClass: "browse" as const, degraded: false }) },
    catalog,
    surfaceIdFor: () => "slot-a",
    models: { small: "qwen3:1.7b", large: "Qwen3.5-35B" },
  });
}

const toolResult = {
  userQuery: "看看有什么片",
  toolCall: { name: "getMovies", args: {} },
  result: [{ id: 1, title: "沙丘" }],
};

describe("编译过程的步骤追踪", () => {
  test("每一步都记录用了哪个模型、耗时多少", async () => {
    const { trace } = await middleware().onToolResult(toolResult);

    expect(trace.map((step) => step.label)).toEqual(["意图分类", "候选集", "L2 编译"]);
    expect(trace[0]).toMatchObject({ id: "intent", model: "qwen3:1.7b", detail: "browse" });
    expect(trace[2]).toMatchObject({ model: "Qwen3.5-35B" });
    for (const step of trace) {
      expect(typeof step.durationMs).toBe("number");
    }
  });

  test("缓存命中时那一步明确标出没有调用模型", async () => {
    const mw = middleware();

    await mw.onToolResult(toolResult);
    const { trace } = await mw.onToolResult(toolResult);

    const last = trace[trace.length - 1];
    expect(last?.label).toBe("L0 命中");
    expect(last?.model).toBeUndefined();
  });
});
