import type { GenerativeUIEvent, TraceStep } from "@next-a2ui/adapter";
import type { ObservedCall } from "../server/agent.ts";
import { middleware } from "../server/engine.ts";

/**
 * 把 agent 观察到的每次 tool 调用送进编译中间件，并把各步追踪拼进总链路。
 *
 * 追踪要覆盖完整链路而不只是编译那一段——分层模型的成本结构只有把 agent
 * 推理、意图分类、编译摆在一起才看得出来。
 */
export async function compileTurn(
  userQuery: string,
  calls: readonly ObservedCall[],
  events: GenerativeUIEvent[],
  trace: TraceStep[],
): Promise<void> {
  for (const [index, call] of calls.entries()) {
    const outcome = await middleware.onToolResult({
      userQuery,
      toolCall: { name: call.name, args: call.args },
      result: call.result,
    });
    events.push(outcome.event);
    trace.push(
      ...outcome.trace.map((step) => ({
        ...step,
        id: `${call.name}-${index}-${step.id}`,
        label: `${call.name} · ${step.label}`,
      })),
    );
  }
}
