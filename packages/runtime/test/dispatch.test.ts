import { describe, expect, test } from "bun:test";
import { buildActionMessage } from "../src/dispatch.ts";

const at = new Date("2026-09-09T10:00:00.000Z");

describe("buildActionMessage", () => {
  test("产出符合 A2UI v1.0 规范的回传消息", () => {
    const message = buildActionMessage({
      action: { event: { name: "play" } },
      surfaceId: "slot-a",
      sourceComponentId: "root",
      payload: undefined,
      now: at,
    });

    expect(message).toEqual({
      version: "v1.0",
      action: {
        name: "play",
        surfaceId: "slot-a",
        sourceComponentId: "root",
        timestamp: "2026-09-09T10:00:00.000Z",
        context: {},
      },
    });
  });

  test("标量载荷放进 context.value", () => {
    const message = buildActionMessage({
      action: { event: { name: "play" } },
      surfaceId: "slot-a",
      sourceComponentId: "root",
      payload: 3,
      now: at,
    });

    expect(message.action.context).toEqual({ value: 3 });
  });

  test("对象载荷并入 context，声明的 context 作为默认值", () => {
    const message = buildActionMessage({
      action: { event: { name: "play", context: { source: "grid" } } },
      surfaceId: "slot-a",
      sourceComponentId: "root",
      payload: { movieId: 3 },
      now: at,
    });

    expect(message.action.context).toEqual({ source: "grid", movieId: 3 });
  });

  test("userMessage 原样带出，供 agent 写进对话历史", () => {
    const message = buildActionMessage({
      action: { event: { name: "play", userMessage: "播放这部片" } },
      surfaceId: "slot-a",
      sourceComponentId: "root",
      payload: undefined,
      now: at,
    });

    expect(message.action.userMessage).toBe("播放这部片");
  });
});
