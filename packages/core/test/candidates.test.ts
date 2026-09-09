import { describe, expect, test } from "bun:test";
import { candidates } from "../src/candidates.ts";
import type { ComponentContract } from "../src/contract.ts";
import { describeShape } from "../src/data-shape.ts";

function listComponent(id: string, required: string[]): ComponentContract {
  return {
    id,
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
