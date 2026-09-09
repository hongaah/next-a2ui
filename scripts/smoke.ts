/**
 * 分层模型的真实链路冒烟。
 *
 * 需要网络，不进 CI。启动前必须清代理，见 README。
 */
import { Compiler, describeShape, MemoryCacheStore, MemoryVariantPool } from "@next-a2ui/core";
import { createAISDKClient, createIntentClassifier, createModelTiersFromEnv } from "@next-a2ui/llm";
import { buildMovieCatalog } from "../packages/eval/fixtures/movie-catalog.ts";

const tiers = createModelTiersFromEnv(process.env);
const catalog = buildMovieCatalog();

const classifier = createIntentClassifier({ model: tiers.small });
const compiler = new Compiler({
  cache: new MemoryCacheStore(),
  llm: createAISDKClient({ model: tiers.large }),
  variants: new MemoryVariantPool(),
  telemetry: {
    compiled: (event) =>
      console.log(
        `    [编译] ${event.source}  组件候选 ${event.componentCandidates}  动作候选 ${event.actionCandidates}  ${event.durationMs.toFixed(0)}ms`,
      ),
    interacted: () => {},
  },
});

const movies = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  title: `影片 ${i}`,
  poster: `/p/${i}.jpg`,
  rating: 7 + (i % 3),
  year: 2024,
}));

const scenarios = [
  {
    query: "帮我找 2024 年之后的科幻片",
    toolCall: { name: "getMovies", args: { genre: "sci-fi", yearGte: 2024 } },
    data: movies,
  },
  {
    query: "换成恐怖片看看",
    toolCall: { name: "getMovies", args: { genre: "horror", yearGte: 2024 } },
    data: movies.slice(0, 9),
  },
];

for (const scenario of scenarios) {
  console.log(`\n用户：${scenario.query}`);

  const started = performance.now();
  const intent = await classifier.classify({
    userQuery: scenario.query,
    toolCall: scenario.toolCall,
    shape: describeShape(scenario.data),
  });
  console.log(
    `    [意图] ${intent.intentClass}${intent.degraded ? "（降级）" : ""}  ${(performance.now() - started).toFixed(0)}ms  ← 本地小模型`,
  );

  const result = await compiler.compile({
    toolCall: scenario.toolCall,
    data: scenario.data,
    intentClass: intent.intentClass,
    catalog,
  });

  if (result.degraded !== null) {
    console.log(`    [降级] ${result.degraded.stage}`);
    if (result.degraded.stage === "compile-error")
      console.log(`           ${result.degraded.message}`);
    if (result.degraded.stage === "validation")
      console.log(`           ${JSON.stringify(result.degraded.errors)}`);
  }
  if (result.capabilityGap !== null) console.log(`    [gap] ${result.capabilityGap.reason}`);
  if (result.surface !== null) {
    console.log(`    [界面] ${result.surface.components.map((c) => c.component).join(" > ")}`);
    console.log(`           ${JSON.stringify(result.surface.components)}`);
  }
  if (result.actions.length > 0) console.log(`    [动作] ${JSON.stringify(result.actions)}`);
}
