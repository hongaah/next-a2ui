import type { GenerativeUIEvent } from "@next-a2ui/adapter";
import { runAgent } from "../../../server/agent.ts";
import { compileLog, middleware } from "../../../server/engine.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const { query } = (await request.json()) as { query: string };

  const started = performance.now();
  // agent 正常干活，完全不知道 UI 的存在
  const { text, calls } = await runAgent(query);
  const agentMs = performance.now() - started;

  // 编译中间件在事件流后面观察 tool 结果
  const events: GenerativeUIEvent[] = [];
  for (const call of calls) {
    events.push(
      await middleware.onToolResult({
        userQuery: query,
        toolCall: { name: call.name, args: call.args },
        result: call.result,
      }),
    );
  }

  return Response.json({
    text,
    events,
    agentMs: Math.round(agentMs),
    totalMs: Math.round(performance.now() - started),
    log: compileLog.slice(0, 5),
  });
}
