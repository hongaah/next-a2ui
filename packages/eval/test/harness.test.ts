import { describe, expect, test } from "bun:test";
import { buildMovieCatalog } from "../fixtures/movie-catalog.ts";

const movieCatalog = buildMovieCatalog();

import { type GoldCase, runEval } from "../src/harness.ts";
import { firstCandidateLLM } from "../src/scripted-llm.ts";

const movies = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: i,
    title: `M${i}`,
    poster: "p.jpg",
    rating: 8,
  }));

describe("runEval", () => {
  test("同一意图重复出现时，命中率反映缓存复用", async () => {
    const cases: GoldCase[] = [
      {
        name: "浏览科幻片",
        toolCall: { name: "getMovies", args: { genre: "sci-fi" } },
        data: movies(12),
        intentClass: "browse",
      },
      {
        name: "浏览恐怖片（同意图，不同取值）",
        toolCall: { name: "getMovies", args: { genre: "horror" } },
        data: movies(15),
        intentClass: "browse",
      },
    ];

    const report = await runEval(cases, { catalog: movieCatalog, llm: firstCandidateLLM() });

    expect(report.total).toBe(2);
    expect(report.hits).toBe(1);
    expect(report.hitRate).toBe(0.5);
  });
});

describe("runEval 结构断言", () => {
  const options = { catalog: movieCatalog, llm: firstCandidateLLM() };

  test("期望组件不在候选集中时记录失败", async () => {
    const cases: GoldCase[] = [
      {
        name: "无封面结果期望网格",
        toolCall: { name: "getMovies", args: {} },
        // 缺 poster，MovieGrid 不可能安全渲染
        data: [{ id: 1, title: "M1" }],
        intentClass: "browse",
        expectComponents: ["MovieGrid"],
      },
    ];

    const report = await runEval(cases, options);

    expect(report.failures).toEqual([
      { case: "无封面结果期望网格", kind: "missing-component", detail: "MovieGrid" },
    ]);
  });

  test("期望组件与动作都满足时没有失败", async () => {
    const cases: GoldCase[] = [
      {
        name: "带封面的浏览",
        toolCall: { name: "getMovies", args: { genre: "sci-fi" } },
        data: [{ id: 1, title: "M1", poster: "p.jpg", rating: 8 }],
        intentClass: "browse",
        expectComponents: ["MovieGrid", "MovieList"],
        expectActions: ["setFilter"],
      },
    ];

    const report = await runEval(cases, options);

    expect(report.failures).toEqual([]);
  });
});

describe("runEval 编译指标", () => {
  test("报告 gap 数、降级数与平均候选集规模", async () => {
    const cases: GoldCase[] = [
      {
        name: "带封面的浏览",
        toolCall: { name: "getMovies", args: { genre: "sci-fi" } },
        data: movies(12),
        intentClass: "browse",
      },
      {
        name: "catalog 拿不下的标量结果",
        toolCall: { name: "getCount", args: {} },
        data: 42,
        intentClass: "explain",
      },
    ];

    const report = await runEval(cases, { catalog: movieCatalog, llm: firstCandidateLLM() });

    expect(report.gaps).toBe(1);
    expect(report.degraded).toBe(0);
    // 第一例 2 个组件候选（Grid/List；Comparison 因 maxItems=5 出局、
    // EmptyState 因 maxItems=0 出局），第二例标量 0 个
    expect(report.avgComponentCandidates).toBe(1);
  });
});

describe("runEval 报告诚实性", () => {
  const browse = (n: number, name: string): GoldCase => ({
    name,
    toolCall: { name: "getMovies", args: { genre: "sci-fi" } },
    data: movies(n),
    intentClass: "browse",
  });

  test("命中缓存的用例不拉低平均候选集规模", async () => {
    // 两例同意图：第一例走 L2 算出候选集，第二例命中 L0 根本不算
    const report = await runEval([browse(12, "首次"), browse(15, "命中")], {
      catalog: movieCatalog,
      llm: firstCandidateLLM(),
    });

    expect(report.hits).toBe(1);
    // MovieGrid + MovieList，不该被 L0 的 0 稀释成 1
    expect(report.avgComponentCandidates).toBe(2);
  });

  test("报告区分用例数与不同意图数", async () => {
    const report = await runEval([browse(12, "a"), browse(15, "b"), browse(18, "c")], {
      catalog: movieCatalog,
      llm: firstCandidateLLM(),
    });

    expect(report.total).toBe(3);
    expect(report.uniqueIntents).toBe(1);
  });
});
