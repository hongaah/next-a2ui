import { describe, expect, test } from "bun:test";
import type { ActionContract, ActionPlan } from "../src/action.ts";
import { MemoryCacheStore } from "../src/cache-store.ts";
import { type Catalog, Compiler, type LLMClient } from "../src/compiler.ts";
import type { ComponentContract } from "../src/contract.ts";
import type { SurfaceTemplate } from "../src/surface.ts";

const movieRow: ComponentContract = {
  id: "MovieRow",
  dataProp: "movies",
  accepts: { type: "array", items: { type: "object", required: ["title"] } },
  emits: [{ name: "select" }],
  semantics: { use: "以行列表展示影片", avoid: "" },
  density: "normal",
};

const setFilter: ActionContract = {
  id: "setFilter",
  params: { type: "object", required: ["genre"] },
  semantics: { use: "改变当前列表页的筛选条件", avoid: "" },
  scope: "page",
  reversible: true,
};

const catalog: Catalog = {
  id: "movie-web",
  version: "1.0.0",
  components: [movieRow],
  actions: [setFilter],
};

class PlanningLLM implements LLMClient {
  composeCalls = 0;
  planCalls = 0;

  async composeSurface(): Promise<SurfaceTemplate> {
    this.composeCalls += 1;
    return { rootId: "root", components: [{ id: "root", component: "MovieRow" }] };
  }

  async planActions(): Promise<readonly ActionPlan[]> {
    this.planCalls += 1;
    return [{ actionId: "setFilter", paramMapping: { genre: "genre" } }];
  }
}

const movies = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i, title: `M${i}` }));

describe("Compiler 动作编译", () => {
  test("命中缓存后，action 参数仍按本次 tool 实参重新绑定", async () => {
    const llm = new PlanningLLM();
    const compiler = new Compiler({ cache: new MemoryCacheStore(), llm });
    const base = { data: movies(12), intentClass: "filter" as const, catalog };

    const first = await compiler.compile({
      ...base,
      toolCall: { name: "getMovies", args: { genre: "sci-fi" } },
    });
    const second = await compiler.compile({
      ...base,
      toolCall: { name: "getMovies", args: { genre: "horror" } },
    });

    expect(first.actions).toEqual([
      { actionId: "setFilter", params: { genre: "sci-fi" }, requiresConfirmation: false },
    ]);
    expect(second.source).toBe("L0");
    expect(llm.planCalls).toBe(1);
    expect(second.actions).toEqual([
      { actionId: "setFilter", params: { genre: "horror" }, requiresConfirmation: false },
    ]);
  });
});

describe("Compiler action-only", () => {
  test("组件无候选但动作有候选时，产出纯动作而不是 gap", async () => {
    const llm = new PlanningLLM();
    const compiler = new Compiler({ cache: new MemoryCacheStore(), llm });

    const result = await compiler.compile({
      // catalog 里只有渲染数组的组件，拿不下单个对象；但 setFilter 可用
      toolCall: { name: "getMovies", args: { genre: "sci-fi" } },
      data: { total: 42, genre: "sci-fi" },
      intentClass: "filter",
      catalog,
    });

    expect(result.capabilityGap).toBeNull();
    expect(result.surface).toBeNull();
    expect(llm.composeCalls).toBe(0);
    expect(result.actions).toEqual([
      { actionId: "setFilter", params: { genre: "sci-fi" }, requiresConfirmation: false },
    ]);
  });
});
