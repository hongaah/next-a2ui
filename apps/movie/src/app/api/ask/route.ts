import type { GenerativeUIEvent, TraceStep } from "@next-a2ui/adapter";
import { runAgent } from "../../../server/agent.ts";
import { compileLog } from "../../../server/engine.ts";
import { modelLabels } from "../../../server/models.ts";
import { commit, history, reset } from "../../../server/session.ts";
import { compileTurn } from "../../shared.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const { query, fresh } = (await request.json()) as { query: string; fresh?: boolean };
  if (fresh === true) reset();

  const started = performance.now();
  // agent 正常干活，完全不知道 UI 的存在
  const turn = await runAgent([...history(), { role: "user", content: query }]);
  commit(turn.messages);
  const agentMs = performance.now() - started;

  const trace: TraceStep[] = [
    {
      id: "agent",
      label: "agent 推理",
      detail: `${turn.calls.length} 次 tool 调用${turn.calls.length === 0 ? "" : `：${turn.calls.map((c) => c.name).join("、")}`}`,
      model: modelLabels.large,
      durationMs: agentMs,
    },
  ];
  const events: GenerativeUIEvent[] = [];
  await compileTurn(query, turn.calls, events, trace);

  return Response.json({
    text: turn.text,
    events,
    trace,
    totalMs: Math.round(performance.now() - started),
    log: compileLog.slice(0, 5),
  });
}
