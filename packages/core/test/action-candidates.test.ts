import { describe, expect, test } from "bun:test";
import type { ActionContract } from "../src/action.ts";
import { actionCandidates } from "../src/candidates.ts";

const setFilter: ActionContract = {
  id: "setFilter",
  params: { type: "object", required: ["genre"] },
  semantics: { use: "改变当前列表页的筛选条件", avoid: "不要用于跨页导航" },
  scope: "page",
  reversible: true,
};

const openSeatMap: ActionContract = {
  id: "openSeatMap",
  params: { type: "object", required: ["showtimeId"] },
  semantics: { use: "打开选座图", avoid: "" },
  scope: "app",
  reversible: true,
};

describe("actionCandidates", () => {
  test("必需参数无法从 tool 实参满足的动作不进候选集", () => {
    const ids = actionCandidates([setFilter, openSeatMap], ["genre", "yearGte"]).map((a) => a.id);

    expect(ids).toEqual(["setFilter"]);
  });
});
