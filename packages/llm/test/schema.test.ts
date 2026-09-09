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
