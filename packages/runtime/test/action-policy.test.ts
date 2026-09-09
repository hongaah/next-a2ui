import { describe, expect, test } from "bun:test";
import type { ActionInvocation } from "@next-a2ui/core";
import { partitionActions } from "../src/action-policy.ts";

const reversible: ActionInvocation = {
  actionId: "setFilter",
  params: { genre: "sci-fi" },
  requiresConfirmation: false,
};
const irreversible: ActionInvocation = {
  actionId: "placeOrder",
  params: { showtimeId: "s1" },
  requiresConfirmation: true,
};

describe("partitionActions", () => {
  test("可逆动作可自动派发", () => {
    const { auto } = partitionActions([reversible]);

    expect(auto).toEqual([reversible]);
  });

  test("不可逆动作绝不进自动派发队列", () => {
    const { auto, needsConfirmation } = partitionActions([reversible, irreversible]);

    expect(auto).toEqual([reversible]);
    expect(needsConfirmation).toEqual([irreversible]);
  });
});
