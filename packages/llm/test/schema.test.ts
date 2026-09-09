import { describe, expect, test } from "bun:test";
import type { ComponentContract } from "@next-a2ui/core";
import { describeShape } from "@next-a2ui/core";
import { buildSurfaceSchema } from "../src/schema.ts";

const movieGrid: ComponentContract = {
  id: "MovieGrid",
  accepts: { type: "array", items: { type: "object", required: ["title", "poster"] } },
  emits: [{ name: "select" }],
  semantics: { use: "封面优先的影片网格", avoid: "" },
  density: "rich",
};

const shape = describeShape([{ id: 1, title: "沙丘", poster: "/p.jpg" }]);

describe("buildSurfaceSchema 组件约束", () => {
  test("候选集之外的组件不被 schema 接受", () => {
    const schema = buildSurfaceSchema([movieGrid], shape);

    const result = schema.safeParse({
      rootId: "root",
      components: [{ id: "root", component: "TimelineChart" }],
    });

    expect(result.success).toBe(false);
  });

  test("候选集之内的组件被接受", () => {
    const schema = buildSurfaceSchema([movieGrid], shape);

    const result = schema.safeParse({
      rootId: "root",
      components: [{ id: "root", component: "MovieGrid" }],
    });

    expect(result.success).toBe(true);
  });
});

describe("buildSurfaceSchema 绑定约束", () => {
  const parse = (path: string) =>
    buildSurfaceSchema([movieGrid], shape).safeParse({
      rootId: "root",
      components: [{ id: "root", component: "MovieGrid", bindings: { label: { path } } }],
    });

  test("数据里不存在的字段不被 schema 接受", () => {
    expect(parse("director").success).toBe(false);
  });

  test("子作用域字段被接受", () => {
    expect(parse("title").success).toBe(true);
  });

  test("根路径被接受", () => {
    expect(parse("/").success).toBe(true);
  });

  test("单对象数据上，根作用域字段路径被接受", () => {
    const detailShape = describeShape({ title: "沙丘", synopsis: "..." });
    const result = buildSurfaceSchema([movieGrid], detailShape).safeParse({
      rootId: "root",
      components: [{ id: "root", component: "MovieGrid", bindings: { t: { path: "/title" } } }],
    });

    expect(result.success).toBe(true);
  });
});
