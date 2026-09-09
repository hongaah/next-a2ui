import type { ActionContract, ActionInvocation, ActionPlan } from "./action.ts";

/**
 * 把可缓存的动作计划与本次 tool 实参合成一次实际调用。
 *
 * 参数**不经模型**：agent 调 tool 时已经把它们算好了，这里只做搬运。
 * 因此命中缓存后 action-only 模式是 0 次模型调用，且参数永远与 agent 的
 * 意图一致——它就是 agent 自己传的那些值。
 */
export function bindActionPlan(
  plan: ActionPlan,
  action: ActionContract,
  toolArgs: Readonly<Record<string, unknown>>,
): ActionInvocation {
  const params: Record<string, unknown> = {};
  for (const [paramName, argName] of Object.entries(plan.paramMapping)) {
    const value = toolArgs[argName];
    if (value !== undefined) params[paramName] = value;
  }

  return {
    actionId: plan.actionId,
    params,
    requiresConfirmation: !action.reversible,
  };
}
