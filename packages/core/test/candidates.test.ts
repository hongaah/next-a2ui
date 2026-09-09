import { describe, expect, test } from "bun:test";
import { candidates } from "../src/candidates.ts";
import type { ComponentContract } from "../src/contract.ts";
import { describeShape } from "../src/data-shape.ts";

function listComponent(id: string, required: string[]): ComponentContract {
  return {
    id,
    dataProp: "movies",
    accepts: { type: "array", items: { type: "object", required } },
    emits: [{ name: "select" }],
    semantics: { use: `渲染 ${id}`, avoid: "" },
    density: "normal",
  };
}

const catalog: ComponentContract[] = [
  listComponent("MovieCard", ["title", "poster"]),
  listComponent("MovieRow", ["title"]),
];

describe("candidates", () => {
  test("必需字段未被数据保证的组件不进候选集", () => {
    const shape = describeShape([{ id: 1, title: "Dune" }]);

    const ids = candidates(catalog, shape).map((c) => c.id);

    expect(ids).toEqual(["MovieRow"]);
  });
});

function detailComponent(id: string, required: string[]): ComponentContract {
  return {
    id,
    dataProp: "movie",
    accepts: { type: "object", required },
    emits: [],
    semantics: { use: `渲染 ${id}`, avoid: "" },
    density: "rich",
  };
}

const mixedCatalog: ComponentContract[] = [
  listComponent("MovieRow", ["title"]),
  detailComponent("MovieDetail", ["title", "synopsis"]),
];

describe("candidates 基数匹配", () => {
  test("单个对象只匹配详情类组件，不匹配列表类组件", () => {
    const shape = describeShape({ id: 1, title: "Dune", synopsis: "..." });

    const ids = candidates(mixedCatalog, shape).map((c) => c.id);

    expect(ids).toEqual(["MovieDetail"]);
  });

  test("数组只匹配列表类组件，不匹配详情类组件", () => {
    const shape = describeShape([{ id: 1, title: "Dune", synopsis: "..." }]);

    const ids = candidates(mixedCatalog, shape).map((c) => c.id);

    expect(ids).toEqual(["MovieRow"]);
  });
});

describe("candidates 数量约束", () => {
  const emptyState: ComponentContract = {
    id: "EmptyState",
    dataProp: "movies",
    accepts: { type: "array", maxItems: 0 },
    emits: [{ name: "reset" }],
    semantics: { use: "查询无结果时的空态", avoid: "有结果时不要用" },
    density: "compact",
  };
  const comparison: ComponentContract = {
    id: "MovieComparison",
    dataProp: "movies",
    accepts: { type: "array", maxItems: 5, items: { type: "object", required: ["title"] } },
    emits: [],
    semantics: { use: "并排对比两三部影片", avoid: "超过 5 条不要用" },
    density: "normal",
  };
  const constrained = [listComponent("MovieList", ["title"]), emptyState, comparison];
  const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i, title: `M${i}` }));

  test("空态组件不匹配有内容的列表", () => {
    const ids = candidates(constrained, describeShape(rows(12))).map((c) => c.id);

    expect(ids).toEqual(["MovieList"]);
  });

  test("空态组件匹配空列表", () => {
    const ids = candidates(constrained, describeShape([])).map((c) => c.id);

    expect(ids).toContain("EmptyState");
  });

  test("数量上限落在分桶范围内时，组件不进候选集", () => {
    // 6-20 这一桶整体超出 maxItems=5，无法保证桶内每个长度都能渲染
    const ids = candidates(constrained, describeShape(rows(8))).map((c) => c.id);

    expect(ids).not.toContain("MovieComparison");
  });

  test("分桶完全落在数量上限内时，组件进候选集", () => {
    const ids = candidates(constrained, describeShape(rows(3))).map((c) => c.id);

    expect(ids).toContain("MovieComparison");
  });
});

describe("candidates 空数组的空真语义", () => {
  test("数组必定为空时，元素字段要求视为空真", () => {
    // 空态组件的类型上仍标着元素形状，但空数组根本没有元素要渲染
    const emptyState: ComponentContract = {
      id: "EmptyState",
      dataProp: "movies",
      accepts: {
        type: "array",
        maxItems: 0,
        items: { type: "object", required: ["id", "title"] },
      },
      emits: [{ name: "reset" }],
      semantics: { use: "查询无结果时的空态", avoid: "" },
      density: "compact",
    };

    const ids = candidates([emptyState], describeShape([])).map((c) => c.id);

    expect(ids).toEqual(["EmptyState"]);
  });

  test("数组可能非空时，元素字段要求照常适用", () => {
    const strict = listComponent("MovieCard", ["title", "poster"]);

    const ids = candidates([strict], describeShape([{ id: 1, title: "M" }])).map((c) => c.id);

    expect(ids).toEqual([]);
  });
});
