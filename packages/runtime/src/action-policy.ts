import type { ActionInvocation } from "@next-a2ui/core";

export interface ActionPartition {
  readonly auto: readonly ActionInvocation[];
  readonly needsConfirmation: readonly ActionInvocation[];
}

/**
 * 动作的执行策略。
 *
 * 不可逆动作（下单、删除）绝不自动派发——它们必须先渲染确认。这是把 agent
 * 接进现有 app 时最要紧的一条安全边界：编译器可能选错组件，那只是界面难看；
 * 自动执行了一次下单，那是事故。
 *
 * 可逆性由契约声明，不由模型判断。
 */
export function partitionActions(actions: readonly ActionInvocation[]): ActionPartition {
  const auto: ActionInvocation[] = [];
  const needsConfirmation: ActionInvocation[] = [];
  for (const action of actions) {
    (action.requiresConfirmation ? needsConfirmation : auto).push(action);
  }
  return { auto, needsConfirmation };
}
