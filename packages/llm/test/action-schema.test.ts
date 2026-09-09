import { describe, expect, test } from "bun:test";
import type { ActionContract } from "@next-a2ui/core";
import { buildActionPlanSchema } from "../src/schema.ts";

const setFilter: ActionContract = {
  id: "setFilter",
  params: { type: "object", required: ["genre"] },
  semantics: { use: "改变当前列表页的筛选条件", avoid: "" },
  scope: "page",
  reversible: true,
};

const args = ["genre", "yearGte"];

describe("buildActionPlanSchema", () => {
  test("候选集之外的动作不被接受", () => {
    const result = buildActionPlanSchema([setFilter], args).safeParse({
      plans: [{ actionId: "placeOrder", paramMapping: { genre: "genre" } }],
    });

    expect(result.success).toBe(false);
  });

  test("参数映射到不存在的 tool 实参时不被接受", () => {
    const result = buildActionPlanSchema([setFilter], args).safeParse({
      plans: [{ actionId: "setFilter", paramMapping: { genre: "categoryName" } }],
    });

    expect(result.success).toBe(false);
  });

  test("映射到真实实参时被接受", () => {
    const result = buildActionPlanSchema([setFilter], args).safeParse({
      plans: [{ actionId: "setFilter", paramMapping: { genre: "genre", minYear: "yearGte" } }],
    });

    expect(result.success).toBe(true);
  });

  test("本次没有可用实参时，只接受空映射", () => {
    const schema = buildActionPlanSchema([setFilter], []);

    expect(schema.safeParse({ plans: [{ actionId: "setFilter", paramMapping: {} }] }).success).toBe(
      true,
    );
    expect(
      schema.safeParse({ plans: [{ actionId: "setFilter", paramMapping: { genre: "genre" } }] })
        .success,
    ).toBe(false);
  });
});
