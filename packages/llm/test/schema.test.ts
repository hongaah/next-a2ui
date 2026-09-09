import { describe, expect, test } from "bun:test";
import type { ComponentContract } from "@next-a2ui/core";
import { buildSurfaceSchema } from "../src/schema.ts";

const movieGrid: ComponentContract = {
  id: "MovieGrid",
  dataProp: "movies",
  accepts: { type: "array", items: { type: "object", required: ["title", "poster"] } },
  emits: [{ name: "select" }],
  semantics: { use: "封面优先的影片网格", avoid: "" },
  density: "rich",
};

describe("buildSurfaceSchema 组件约束", () => {
  test("候选集之外的组件不被 schema 接受", () => {
    const schema = buildSurfaceSchema([movieGrid]);

    const result = schema.safeParse({
      rootId: "root",
      components: [{ id: "root", component: "TimelineChart" }],
    });

    expect(result.success).toBe(false);
  });

  test("候选集之内的组件被接受", () => {
    const schema = buildSurfaceSchema([movieGrid]);

    const result = schema.safeParse({
      rootId: "root",
      components: [{ id: "root", component: "MovieGrid" }],
    });

    expect(result.success).toBe(true);
  });
});

describe("buildSurfaceSchema 子节点约束", () => {
  test("没有容器组件时，schema 里不含 children —— 模型无从编造子节点", () => {
    const result = buildSurfaceSchema([movieGrid]).safeParse({
      components: [{ id: "a", component: "MovieGrid", children: ["ghost"] }],
    });

    // children 被剥掉而不是报错：多余属性不该让整次编译失败
    expect(result.success).toBe(true);
    expect((result.data as { components: Array<Record<string, unknown>> }).components[0]).toEqual({
      id: "a",
      component: "MovieGrid",
    });
  });

  test("存在容器组件时，schema 允许 children", () => {
    const container: ComponentContract = { ...movieGrid, id: "Section", acceptsChildren: true };

    const result = buildSurfaceSchema([container, movieGrid]).safeParse({
      components: [
        { id: "a", component: "Section", children: ["b"] },
        { id: "b", component: "MovieGrid" },
      ],
    });

    expect(result.success).toBe(true);
    expect(
      (result.data as { components: Array<{ children?: string[] }> }).components[0]?.children,
    ).toEqual(["b"]);
  });
});
