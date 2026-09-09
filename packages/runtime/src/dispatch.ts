import type { ComponentAction } from "@next-a2ui/core";

export interface ActionMessage {
  readonly version: "v1.0";
  readonly action: {
    readonly name: string;
    readonly userMessage?: string;
    readonly surfaceId: string;
    readonly sourceComponentId: string;
    readonly timestamp: string;
    readonly context: Readonly<Record<string, unknown>>;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 把一次用户交互构造成 A2UI 的 renderer→agent 回传消息。
 *
 * 这是 A2UI 回路的另一半：agent 给出界面，用户在界面上操作，操作要回到
 * agent，agent 再据此给出新界面。没有这一半，生成式 UI 只是一张静态图。
 *
 * context = 组件声明的静态上下文 + 交互时的运行时载荷。声明在前、载荷在后，
 * 因为载荷更具体（比如列表里点中的是哪一条）。
 */
export function buildActionMessage(input: {
  action: ComponentAction;
  surfaceId: string;
  sourceComponentId: string;
  payload: unknown;
  now?: Date;
}): ActionMessage {
  const declared = input.action.event.context ?? {};
  const runtime = isRecord(input.payload)
    ? input.payload
    : input.payload === undefined
      ? {}
      : { value: input.payload };

  const userMessage = input.action.event.userMessage;

  return {
    version: "v1.0",
    action: {
      name: input.action.event.name,
      ...(userMessage === undefined ? {} : { userMessage }),
      surfaceId: input.surfaceId,
      sourceComponentId: input.sourceComponentId,
      timestamp: (input.now ?? new Date()).toISOString(),
      context: { ...declared, ...runtime },
    },
  };
}
