import type {
  ActionInvocation,
  CapabilityGap,
  CompileResult,
  DegradeReason,
} from "@next-a2ui/core";
import { type A2UIMessage, type MessageOptions, toA2UIMessages } from "./messages.ts";

export interface GenerativeUIEvent {
  readonly type: "CUSTOM";
  readonly name: "next-a2ui.compiled";
  readonly value: {
    readonly surfaceId: string;
    readonly messages: readonly A2UIMessage[];
    readonly actions: readonly ActionInvocation[];
    readonly source: CompileResult["source"];
    readonly degraded: DegradeReason | null;
    readonly capabilityGap: CapabilityGap | null;
  };
}

/**
 * 把编译产物封装成 AG-UI custom event。
 *
 * 动作与 surface 消息分开承载：动作驱动的是宿主**已有**的界面，不是 A2UI
 * surface 的一部分——阶梯 1 的场景里根本没有 surface。
 *
 * 降级与 gap 也必须发出事件。静默什么都不做是最糟的失败方式：宿主会一直
 * 停在加载态，而它本可以立刻切到兜底 UI。
 */
export function toGenerativeUIEvent(
  result: CompileResult,
  options: MessageOptions,
): GenerativeUIEvent {
  return {
    type: "CUSTOM",
    name: "next-a2ui.compiled",
    value: {
      surfaceId: options.surfaceId,
      messages: toA2UIMessages(result, options),
      actions: result.actions,
      source: result.source,
      degraded: result.degraded,
      capabilityGap: result.capabilityGap,
    },
  };
}
