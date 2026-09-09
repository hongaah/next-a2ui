import { describe, expect, test } from "bun:test";
import type { ActionPlan } from "../src/action.ts";
import { MemoryCacheStore } from "../src/cache-store.ts";
import { type Catalog, Compiler, type ComposeInput, type LLMClient } from "../src/compiler.ts";
import type { ComponentContract } from "../src/contract.ts";
import type { SurfaceTemplate } from "../src/surface.ts";

const movieRow: ComponentContract = {
  id: "MovieRow",
  dataProp: "movies",
  accepts: { type: "array", items: { type: "object", required: ["title"] } },
  emits: [{ name: "select" }],
  semantics: { use: "以行列表展示影片", avoid: "超过 100 条时不要用" },
  density: "normal",
};

const catalog: Catalog = { id: "movie-web", version: "1.0.0", components: [movieRow] };

class CountingLLM implements LLMClient {
  calls: ComposeInput[] = [];

  async planActions(): Promise<readonly ActionPlan[]> {
    return [];
  }

  async composeSurface(input: ComposeInput): Promise<SurfaceTemplate> {
    this.calls.push(input);
    return {
      rootId: "root",
      components: [{ id: "root", component: "MovieRow", bindings: { items: { path: "/" } } }],
    };
  }
}

const movies = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i, title: `M${i}` }));

describe("Compiler 缓存命中", () => {
  test("相同意图的第二次编译命中缓存，不再调用模型", async () => {
    const llm = new CountingLLM();
    const compiler = new Compiler({ cache: new MemoryCacheStore(), llm });
    const request = {
      toolCall: { name: "getMovies", args: { genre: "sci-fi" } },
      data: movies(12),
      intentClass: "browse" as const,
      catalog,
    };

    const first = await compiler.compile(request);
    const second = await compiler.compile(request);

    expect(first.source).toBe("L2");
    expect(second.source).toBe("L0");
    expect(llm.calls).toHaveLength(1);
  });
});

describe("Compiler capability gap", () => {
  test("候选集为空时不调用模型，并上报 gap", async () => {
    const llm = new CountingLLM();
    const compiler = new Compiler({ cache: new MemoryCacheStore(), llm });

    const result = await compiler.compile({
      // catalog 里只有渲染数组的组件，拿不下单个对象
      toolCall: { name: "getMovie", args: { id: 1 } },
      data: { id: 1, title: "Dune", synopsis: "..." },
      intentClass: "detail",
      catalog,
    });

    expect(llm.calls).toHaveLength(0);
    expect(result.surface).toBeNull();
    expect(result.capabilityGap).toMatchObject({ reason: "no-candidates", intentClass: "detail" });
  });
});

class InvalidLLM implements LLMClient {
  calls = 0;

  async planActions(): Promise<readonly ActionPlan[]> {
    return [];
  }

  async composeSurface(): Promise<SurfaceTemplate> {
    this.calls += 1;
    // catalog 里没有 TimelineChart
    return { rootId: "root", components: [{ id: "root", component: "TimelineChart" }] };
  }
}

describe("Compiler 产物验证", () => {
  test("模型返回非法模板时不写入缓存", async () => {
    const llm = new InvalidLLM();
    const compiler = new Compiler({ cache: new MemoryCacheStore(), llm });
    const request = {
      toolCall: { name: "getMovies", args: { genre: "sci-fi" } },
      data: movies(12),
      intentClass: "browse" as const,
      catalog,
    };

    await compiler.compile(request);
    const second = await compiler.compile(request);

    expect(llm.calls).toBe(2);
    expect(second.surface).toBeNull();
  });
});

describe("Compiler 降级", () => {
  const request = {
    toolCall: { name: "getMovies", args: { genre: "sci-fi" } },
    data: movies(12),
    intentClass: "browse" as const,
    catalog,
  };

  test("模型调用失败时返回降级结果而不是抛异常", async () => {
    const failing: LLMClient = {
      composeSurface: () => Promise.reject(new Error("模型超时")),
      planActions: async () => [],
    };
    const compiler = new Compiler({ cache: new MemoryCacheStore(), llm: failing });

    const result = await compiler.compile(request);

    expect(result.source).toBe("fallback");
    expect(result.surface).toBeNull();
    expect(result.degraded).toMatchObject({ stage: "compile-error", message: "模型超时" });
  });

  test("编译失败后，同 key 的下一次请求仍会重试", async () => {
    let attempts = 0;
    const flaky: LLMClient = {
      composeSurface: async () => {
        attempts += 1;
        if (attempts === 1) throw new Error("模型超时");
        return { rootId: "root", components: [{ id: "root", component: "MovieRow" }] };
      },
      planActions: async () => [],
    };
    const compiler = new Compiler({ cache: new MemoryCacheStore(), llm: flaky });

    const first = await compiler.compile(request);
    const second = await compiler.compile(request);

    expect(first.source).toBe("fallback");
    expect(second.source).toBe("L2");
  });
});
