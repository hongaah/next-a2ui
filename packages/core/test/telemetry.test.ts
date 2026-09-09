import { describe, expect, test } from "bun:test";
import type { ActionPlan } from "../src/action.ts";
import { MemoryCacheStore } from "../src/cache-store.ts";
import { type Catalog, Compiler, type LLMClient } from "../src/compiler.ts";
import type { ComponentContract } from "../src/contract.ts";
import type { SurfaceTemplate } from "../src/surface.ts";
import type { CompileEvent, TelemetrySink } from "../src/telemetry.ts";

const movieRow: ComponentContract = {
  id: "MovieRow",
  dataProp: "movies",
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

function collectingSink(): { events: CompileEvent[]; sink: TelemetrySink } {
  const events: CompileEvent[] = [];
  return {
    events,
    sink: { compiled: (event) => events.push(event), interacted: () => {} },
  };
}

const request = {
  toolCall: { name: "getMovies", args: { genre: "sci-fi" } },
  data: [{ id: 1, title: "Dune" }],
  intentClass: "browse" as const,
  catalog,
};

describe("Compiler 遥测", () => {
  test("每次编译产生一条事件，记录命中层级与候选集大小", async () => {
    const { events, sink } = collectingSink();
    const compiler = new Compiler({ cache: new MemoryCacheStore(), llm, telemetry: sink });

    await compiler.compile(request);
    await compiler.compile(request);

    expect(events.map((event) => event.source)).toEqual(["L2", "L0"]);
    expect(events[0]).toMatchObject({ componentCandidates: 1, actionCandidates: 0 });
  });
});
