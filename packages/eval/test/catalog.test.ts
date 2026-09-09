import { describe, expect, test } from "bun:test";
import { buildMovieCatalog } from "../fixtures/movie-catalog.ts";

describe("从真实组件源码推导影视 catalog", () => {
  test("五个组件都抽取成功且无漂移", () => {
    const catalog = buildMovieCatalog();

    expect(catalog.components.map((component) => component.id)).toEqual([
      "MovieGrid",
      "MovieList",
      "MovieComparison",
      "MovieDetail",
      "EmptyState",
    ]);
  });

  test("accepts 与 emits 来自组件类型，不是手写的", () => {
    const grid = buildMovieCatalog().components.find((c) => c.id === "MovieGrid");

    expect(grid?.accepts).toEqual({
      type: "array",
      minItems: 1,
      items: { type: "object", required: ["id", "poster", "title"] },
    });
    expect(grid?.emits).toEqual([{ name: "select" }]);
  });
});
