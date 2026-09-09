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
    const { event } = await middleware().onToolResult(toolResult([{ id: 1, title: "沙丘" }]));

    expect(event.value.messages[0]).toHaveProperty("createSurface");
  });

  test("同一 slot 的后续编译只发 updateDataModel，不重发组件树", async () => {
    const mw = middleware();

    await mw.onToolResult(toolResult([{ id: 1, title: "沙丘" }]));
    const { event: second } = await mw.onToolResult(toolResult([{ id: 2, title: "沙丘 2" }]));

    expect(second.value.messages[0]).toHaveProperty("updateDataModel");
    expect(second.value.messages[0]).not.toHaveProperty("createSurface");
  });
});

describe("中间件的模板变更处理", () => {
  const emptyState: ComponentContract = {
    id: "EmptyState",
    dataProp: "movies",
    accepts: { type: "array", maxItems: 0 },
    emits: [{ name: "reset" }],
    semantics: { use: "空态", avoid: "" },
    density: "compact",
  };
  const bigCatalog: Catalog = {
    id: "movie-web",
    version: "1.0.0",
    components: [movieList, emptyState],
  };

  function pickingLLM(): LLMClient {
    return {
      // 模拟真实行为：候选集变了，编出来的组件也变了
      composeSurface: async ({ candidates }) => ({
        rootId: "root",
        components: [{ id: "root", component: candidates[0]?.id ?? "MovieList" }],
      }),
      planActions: async (): Promise<readonly ActionPlan[]> => [],
    };
  }

  test("模板未变时只发 updateDataModel", async () => {
    const mw = createCompileMiddleware({
      compiler: new Compiler({ cache: new MemoryCacheStore(), llm: pickingLLM() }),
      classifier,
      catalog: bigCatalog,
      surfaceIdFor: () => "slot-a",
    });

    await mw.onToolResult(toolResult([{ id: 1, title: "沙丘" }]));
    const { event: second } = await mw.onToolResult(toolResult([{ id: 2, title: "沙丘 2" }]));

    expect(Object.keys(second.value.messages[0] ?? {})).toContain("updateDataModel");
  });

  test("模板变化时必须重发组件树", async () => {
    const mw = createCompileMiddleware({
      compiler: new Compiler({ cache: new MemoryCacheStore(), llm: pickingLLM() }),
      classifier,
      catalog: bigCatalog,
      surfaceIdFor: () => "slot-a",
    });

    await mw.onToolResult(toolResult([{ id: 1, title: "沙丘" }]));
    // 空结果 → 候选集只剩空态组件 → 模板变了
    const { event: changed } = await mw.onToolResult(toolResult([]));

    const keys = changed.value.messages.flatMap((m) =>
      Object.keys(m).filter((k) => k !== "version"),
    );
    // 规范禁止对已存在的 surface 再发 createSurface，必须走 updateComponents
    expect(keys).toContain("updateComponents");
    expect(keys).not.toContain("createSurface");
  });
});
