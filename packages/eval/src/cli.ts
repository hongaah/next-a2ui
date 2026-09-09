import { buildMovieCatalog } from "../fixtures/movie-catalog.ts";
import { movieGoldSet } from "../fixtures/movie-gold-set.ts";
import { runEval } from "./harness.ts";
import { firstCandidateLLM } from "./scripted-llm.ts";

const report = await runEval(movieGoldSet, {
  catalog: buildMovieCatalog(),
  llm: firstCandidateLLM(),
});

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

console.log("\n影视 gold set —— 编译指标\n");
console.log(`  用例数                ${report.total}`);
console.log(`  不同意图签名          ${report.uniqueIntents}`);
console.log(`  L0 命中               ${report.hits}  (${pct(report.hitRate)})`);
console.log(`  capability gap        ${report.gaps}  (${pct(report.gaps / report.total)})`);
console.log(`  降级                  ${report.degraded}`);
console.log(
  `  平均组件候选集        ${report.avgComponentCandidates.toFixed(2)}  (仅计入实际编译的用例)`,
);
console.log(`  结构断言失败          ${report.failures.length}`);
console.log("");
console.log("  注：gold set 是多样性集合而非流量集合，其 hitRate 严重低估稳态表现。");
console.log(
  `      这 ${report.total} 个用例只覆盖 ${report.uniqueIntents} 个意图；真实流量下同样这些意图`,
);
console.log("      被反复命中，稳态命中率趋近 (N - 意图数) / N。");

if (report.failures.length > 0) {
  console.log("\n失败明细：");
  for (const failure of report.failures) {
    console.log(`  ✗ [${failure.case}] ${failure.kind}: ${failure.detail}`);
  }
}
console.log("");

if (report.failures.length > 0) process.exit(1);
