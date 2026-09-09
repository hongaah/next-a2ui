import { describe, expect, test } from "bun:test";
import type { CompileResult } from "@next-a2ui/core";
import { toGenerativeUIEvent } from "../src/event.ts";

const options = { surfaceId: "slot-a", catalogId: "movie-web", data: [{ id: 1, title: "沙丘" }] };

const base: CompileResult = {
  actions: [],
  surface: { rootId: "root", components: [{ id: "root", component: "MovieList" }] },
  source: "L2",
  templateId: "tpl-1",
  capabilityGap: null,
  degraded: null,
};

describe("toGenerativeUIEvent", () => {
  test("动作与 surface 消息分开承载", () => {
    const withAction: CompileResult = {
      ...base,
      actions: [
        { actionId: "setFilter", params: { genre: "sci-fi" }, requiresConfirmation: false },
      ],
    };

    const event = toGenerativeUIEvent(withAction, options);

    expect(event.name).toBe("next-a2ui.compiled");
    expect(event.value.actions).toEqual([
      { actionId: "setFilter", params: { genre: "sci-fi" }, requiresConfirmation: false },
    ]);
    expect(event.value.messages).toHaveLength(1);
  });

  test("降级时仍然发出事件，带降级原因且不含 surface 消息", () => {
    const degraded: CompileResult = {
      ...base,
      surface: null,
      source: "fallback",
      templateId: null,
      degraded: { stage: "compile-error", message: "模型超时" },
    };

    const event = toGenerativeUIEvent(degraded, options);

    expect(event.value.messages).toEqual([]);
    expect(event.value.degraded).toEqual({ stage: "compile-error", message: "模型超时" });
  });

  test("capability gap 原样带出，供宿主上报待办", () => {
    const gap: CompileResult = {
      ...base,
      surface: null,
      source: "gap",
      templateId: null,
      capabilityGap: {
        cacheKey: "k",
        reason: "no-candidates",
        dataShape: "scalar:number",
        intentClass: "explain",
      },
    };

    const event = toGenerativeUIEvent(gap, options);

    expect(event.value.capabilityGap?.reason).toBe("no-candidates");
  });
});
