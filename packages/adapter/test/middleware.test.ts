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
    components: [{ id: "root", component: "MovieList", bindings: { movies: { path: "/" } } }],
  }),
  planActions: async (): Promise<readonly ActionPlan[]> => [],
};

const classifier = {
  classify: async () => ({ intentClass: "browse" as const, degraded: false }),
};

function middleware() {
  return createCompileMiddleware({
    compiler: new Compiler({ cache: new MemoryCacheStore(), llm }),
    classifier,
    catalog,
    surfaceIdFor: () => "slot-a",
  });
}

const toolResult = (data: unknown) => ({
  userQuery: "看看有什么片",
  toolCall: { name: "getMovies", args: { genre: "sci-fi" } },
  result: data,
});

describe("createCompileMiddleware", () => {
  test("首次在某个 slot 上编译时发出 createSurface", async () => {
    const event = await middleware().onToolResult(toolResult([{ id: 1, title: "沙丘" }]));

    expect(event.value.messages[0]).toHaveProperty("createSurface");
  });

  test("同一 slot 的后续编译只发 updateDataModel，不重发组件树", async () => {
    const mw = middleware();

    await mw.onToolResult(toolResult([{ id: 1, title: "沙丘" }]));
    const second = await mw.onToolResult(toolResult([{ id: 2, title: "沙丘 2" }]));

    expect(second.value.messages[0]).toHaveProperty("updateDataModel");
    expect(second.value.messages[0]).not.toHaveProperty("createSurface");
  });
});
