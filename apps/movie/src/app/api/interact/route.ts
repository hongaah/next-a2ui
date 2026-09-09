import type { GenerativeUIEvent, TraceStep } from "@next-a2ui/adapter";
import type { ActionMessage } from "@next-a2ui/runtime";
import { runAgent } from "../../../server/agent.ts";
import { compileLog } from "../../../server/engine.ts";
import { modelLabels } from "../../../server/models.ts";
import { commit, history } from "../../../server/session.ts";
import { compileTurn } from "../../shared.ts";

export const dynamic = "force-dynamic";

/**
 * A2UI 回路的另一半：用户在生成界面上的交互回到 agent。
 *
 * 收到的是规范的 renderer→agent action 消息。把它翻成一轮对话交给 agent，
 * agent 据此决定下一步——可能取详情、可能换一批片——再由编译器给出新界面。
 * 卡片因此不是一张静态图，而是对话的一部分。
 */
function toUserTurn(message: ActionMessage): string {
  const { name, context, userMessage } = message.action;
  const described = Object.entries(context)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join("、");
  return userMessage ?? `我在界面上触发了「${name}」${described === "" ? "" : `（${described}）`}`;
}

export async function POST(request: Request): Promise<Response> {
  const { message } = (await request.json()) as { message: ActionMessage };

  const userTurn = toUserTurn(message);
  const started = performance.now();
  const turn = await runAgent([...history(), { role: "user", content: userTurn }]);
  commit(turn.messages);
  const agentMs = performance.now() - started;

  const trace: TraceStep[] = [
    {
      id: "dispatch",
      label: "卡片交互回传",
      detail: `${message.action.name} · ${message.action.sourceComponentId}`,
      durationMs: 0,
    },
    {
      id: "agent",
      label: "agent 推理",
      detail: `${turn.calls.length} 次 tool 调用${turn.calls.length === 0 ? "" : `：${turn.calls.map((c) => c.name).join("、")}`}`,
      model: modelLabels.large,
      durationMs: agentMs,
    },
  ];
  const events: GenerativeUIEvent[] = [];
  await compileTurn(userTurn, turn.calls, events, trace);

  return Response.json({
    text: turn.text,
    userTurn,
    events,
    trace,
    totalMs: Math.round(performance.now() - started),
    log: compileLog.slice(0, 5),
  });
}
