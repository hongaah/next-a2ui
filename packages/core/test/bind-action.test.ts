import { describe, expect, test } from "bun:test";
import type { ActionContract, ActionPlan } from "../src/action.ts";
import { bindActionPlan } from "../src/bind-action.ts";

const setFilter: ActionContract = {
  id: "setFilter",
  params: { type: "object", required: ["genre"] },
  semantics: { use: "改变当前列表页的筛选条件", avoid: "" },
  scope: "page",
  reversible: true,
};

const placeOrder: ActionContract = {
  id: "placeOrder",
  params: { type: "object", required: ["showtimeId"] },
  semantics: { use: "下单购票", avoid: "" },
  scope: "app",
  reversible: false,
};

describe("bindActionPlan", () => {
  test("参数按映射从 tool 实参取值，不经模型", () => {
    const plan: ActionPlan = {
      actionId: "setFilter",
      paramMapping: { genre: "genre", minYear: "yearGte" },
    };

    const invocation = bindActionPlan(plan, setFilter, { genre: "sci-fi", yearGte: 2024 });

    expect(invocation.params).toEqual({ genre: "sci-fi", minYear: 2024 });
  });

  test("不可逆动作要求宿主先确认", () => {
    const plan: ActionPlan = { actionId: "placeOrder", paramMapping: { showtimeId: "showtimeId" } };

    const invocation = bindActionPlan(plan, placeOrder, { showtimeId: "s1" });

    expect(invocation.requiresConfirmation).toBe(true);
  });
});
