/**
 * 端到端冒烟：真实模型 → 编译 → A2UI v1.0 消息 → 渲染成 HTML。
 *
 * 需要网络，不进 CI。启动前必须清代理，见 README。
 */
import { createCompileMiddleware } from "@next-a2ui/adapter";
import { Compiler, MemoryCacheStore, MemoryVariantPool } from "@next-a2ui/core";
import { createAISDKClient, createIntentClassifier, createModelTiersFromEnv } from "@next-a2ui/llm";
import { EmptyState } from "@next-a2ui/movie/src/components/EmptyState.tsx";
import { MovieComparison } from "@next-a2ui/movie/src/components/MovieComparison.tsx";
import { MovieDetail } from "@next-a2ui/movie/src/components/MovieDetail.tsx";
import { MovieGrid } from "@next-a2ui/movie/src/components/MovieGrid.tsx";
import { MovieList } from "@next-a2ui/movie/src/components/MovieList.tsx";
import { A2UISurfaceView, createRegistry, SurfaceStore } from "@next-a2ui/runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { buildMovieCatalog } from "../packages/eval/fixtures/movie-catalog.ts";

const tiers = createModelTiersFromEnv(process.env);
const catalog = buildMovieCatalog();

const registry = createRegistry(catalog.components, {
  MovieGrid,
  MovieList,
  MovieComparison,
  MovieDetail,
  EmptyState,
} as never);

const middleware = createCompileMiddleware({
  compiler: new Compiler({
    cache: new MemoryCacheStore(),
    llm: createAISDKClient({ model: tiers.large }),
    variants: new MemoryVariantPool(),
    telemetry: {
      compiled: (e) =>
        console.log(
          `    [编译] ${e.source}  组件候选 ${e.componentCandidates}  动作候选 ${e.actionCandidates}  ${e.durationMs.toFixed(0)}ms`,
        ),
      interacted: () => {},
    },
  }),
  classifier: createIntentClassifier({ model: tiers.small }),
  catalog,
  surfaceIdFor: () => "slot-a",
});

const movies = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  title: `影片 ${i}`,
  poster: `/p/${i}.jpg`,
  rating: 7 + (i % 3),
  year: 2024,
}));

const store = new SurfaceStore();

const scenarios = [
  {
    userQuery: "帮我找 2024 年之后的科幻片",
    toolCall: { name: "getMovies", args: { genre: "sci-fi", yearGte: 2024 } },
    result: movies,
  },
  {
    userQuery: "换成恐怖片看看",
    toolCall: { name: "getMovies", args: { genre: "horror", yearGte: 2024 } },
    result: movies.slice(0, 9),
  },
  {
    userQuery: "筛严一点，2030 年之后的",
    toolCall: { name: "getMovies", args: { genre: "sci-fi", yearGte: 2030 } },
    result: [],
  },
];

for (const scenario of scenarios) {
  console.log(`\n用户：${scenario.userQuery}`);
  const started = performance.now();
  const event = await middleware.onToolResult(scenario);
  const total = performance.now() - started;

  const value = event.value;
  if (value.degraded !== null) console.log(`    [降级] ${JSON.stringify(value.degraded)}`);
  if (value.capabilityGap !== null) console.log(`    [gap] ${value.capabilityGap.reason}`);
  if (value.actions.length > 0) {
    console.log(
      `    [动作] ${value.actions.map((a) => `${a.actionId}(${JSON.stringify(a.params)})`).join(", ")}`,
    );
  }
  console.log(
    `    [消息] ${
      value.messages
        .map((m) =>
          Object.keys(m)
            .filter((k) => k !== "version")
            .join(),
        )
        .join(" + ") || "（无）"
    }`,
  );

  // 真实场景里 slot 挂载一次、持续接收事件，内部 store 跨事件保持。
  // 这里直接持有 store 以如实建模；GenerativeSlot 在活的应用里做的是同一件事。
  for (const message of value.messages) store.apply(message);
  const surface = store.get(value.surfaceId);
  const html =
    surface === undefined
      ? "<p>经典视图</p>"
      : renderToStaticMarkup(<A2UISurfaceView surface={surface} registry={registry} />);
  console.log(`    [渲染] ${html.slice(0, 180)}${html.length > 180 ? "…" : ""}`);
  console.log(`    [总耗时] ${total.toFixed(0)}ms`);
}
