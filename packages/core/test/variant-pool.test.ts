import { describe, expect, test } from "bun:test";
import type { ActionPlan } from "../src/action.ts";
import { MemoryCacheStore } from "../src/cache-store.ts";
import { type Catalog, Compiler, type LLMClient } from "../src/compiler.ts";
import type { ComponentContract } from "../src/contract.ts";
import type { SurfaceTemplate } from "../src/surface.ts";
import { MemoryVariantPool } from "../src/variant-pool.ts";

const movieRow: ComponentContract = {
  id: "MovieRow",
  accepts: { type: "array", items: { type: "object", required: ["title"] } },
  emits: [{ name: "select" }],
  semantics: { use: "以行列表展示影片", avoid: "" },
  density: "normal",
};

const catalog: Catalog = { id: "movie-web", version: "1.0.0", components: [movieRow] };

const llm: LLMClient = {
  composeSurface: async (): Promise<SurfaceTemplate> => ({
    rootId: "root",
    components: [{ id: "root", component: "MovieRow" }],
  }),
  planActions: async (): Promise<readonly ActionPlan[]> => [],
};

const base = {
  toolCall: { name: "getMovies", args: { genre: "sci-fi" } },
  data: [{ id: 1, title: "Dune" }],
  intentClass: "browse" as const,
  catalog,
};

describe("变体池", () => {
  test("同一意图下编译出的多个变体都登记进池", async () => {
    const variants = new MemoryVariantPool();
    const compiler = new Compiler({ cache: new MemoryCacheStore(), llm, variants });

    await compiler.compile({ ...base, variantId: "cover-flow" });
    await compiler.compile({ ...base, variantId: "dense-list" });

    const pool = await variants.list(base);

    expect([...pool].sort()).toEqual(["cover-flow", "dense-list"]);
  });

  test("不同意图的变体互不串池", async () => {
    const variants = new MemoryVariantPool();
    const compiler = new Compiler({ cache: new MemoryCacheStore(), llm, variants });

    await compiler.compile({ ...base, variantId: "cover-flow" });
    await compiler.compile({ ...base, intentClass: "compare", variantId: "side-by-side" });

    expect(await variants.list(base)).toEqual(["cover-flow"]);
  });
});
