import type { Catalog, Compiler, IntentClass, ShapeDescriptor, ToolCall } from "@next-a2ui/core";
import { actionCandidates, candidates, describeShape } from "@next-a2ui/core";
import { type GenerativeUIEvent, toGenerativeUIEvent } from "./event.ts";

/** 依赖倒置：adapter 不认识 packages/llm，只认识这个接口。 */
export interface IntentClassifier {
  classify(input: {
    userQuery: string;
    toolCall: ToolCall;
    shape: ShapeDescriptor;
  }): Promise<{ intentClass: IntentClass; degraded: boolean }>;
}

/**
 * 编译过程的一步。用来把引擎的内部动作摊开给人看——哪一步花了多少时间、
 * 用了哪个模型、有没有用模型。分层模型的成本结构只有摊开了才看得见。
 */
export interface TraceStep {
  /** 稳定标识，便于渲染与串接多次 tool 调用的追踪。 */
  readonly id: string;
  readonly label: string;
  readonly detail?: string;
  /** 用了哪个模型。缺省表示这一步没有调用模型。 */
  readonly model?: string;
  readonly durationMs: number;
}

export interface CompileOutcome {
  readonly event: GenerativeUIEvent;
  readonly trace: readonly TraceStep[];
}

export interface ToolResultEvent {
  readonly userQuery: string;
  readonly toolCall: ToolCall;
  readonly result: unknown;
}

/**
 * AG-UI 事件流的编译中间件。
 *
 * agent 侧零改动：它照常调 tool、照常拿数据，完全不知道 UI 的存在。中间件只
 * 在事件流后面观察 tool 结果，算意图、编译、把产物作为 custom event 注入。
 *
 * 唯一的状态是"哪些 slot 上已经有 surface 了"——有了它，后续编译只发
 * updateDataModel，不重发组件树。这是"结构可缓存"省下传输量的地方。
 */
export function createCompileMiddleware(options: {
  compiler: Compiler;
  classifier: IntentClassifier;
  catalog: Catalog;
  surfaceIdFor: (toolCall: ToolCall) => string;
  /** 用于追踪展示的模型名。 */
  models?: { small?: string; large?: string };
}): { onToolResult(event: ToolResultEvent): Promise<CompileOutcome> } {
  // 记录每个 slot 上当前渲染的是哪个模板。只看 surfaceId 不够——模板换了却
  // 只发数据，客户端会拿旧组件树渲染新数据。
  //
  // 这份状态是**会话级**的：一个客户端连接对应一个中间件实例。页面重载会新建
  // 连接、新建实例，因而重新发 createSurface，这正是我们要的。
  const rendered = new Map<string, string>();

  return {
    async onToolResult(event: ToolResultEvent): Promise<CompileOutcome> {
      const trace: TraceStep[] = [];
      const shape = describeShape(event.result);

      const intentStarted = performance.now();
      const intent = await options.classifier.classify({
        userQuery: event.userQuery,
        toolCall: event.toolCall,
        shape,
      });
      trace.push({
        id: "intent",
        label: "意图分类",
        detail: intent.degraded ? `${intent.intentClass}（降级）` : intent.intentClass,
        ...(options.models?.small === undefined ? {} : { model: options.models.small }),
        durationMs: performance.now() - intentStarted,
      });

      const compileStarted = performance.now();
      const result = await options.compiler.compile({
        toolCall: event.toolCall,
        data: event.result,
        intentClass: intent.intentClass,
        catalog: options.catalog,
      });
      const compileMs = performance.now() - compileStarted;

      // 候选集是纯函数，重算一次的开销可忽略；换来的是不必为了展示去耦合
      // 编译器的遥测通道。
      const componentCount = candidates(options.catalog.components, shape).length;
      const actionCount = actionCandidates(
        options.catalog.actions ?? [],
        Object.keys(event.toolCall.args),
      ).length;
      trace.push({
        id: "candidates",
        label: "候选集",
        detail: `${componentCount} 组件 / ${actionCount} 动作`,
        durationMs: 0,
      });

      if (result.source === "L0") {
        // 命中缓存这一步没有 model 字段——这正是分层成本结构里最该被看见的一格
        trace.push({
          id: "compile",
          label: "L0 命中",
          detail: "0 次模型调用",
          durationMs: compileMs,
        });
      } else if (result.source === "gap") {
        trace.push({
          id: "compile",
          label: "能力缺口",
          detail: "候选集为空，未调用模型",
          durationMs: compileMs,
        });
      } else {
        trace.push({
          id: "compile",
          label: result.source === "fallback" ? "编译降级" : "L2 编译",
          ...(result.degraded === null ? {} : { detail: result.degraded.stage }),
          ...(options.models?.large === undefined ? {} : { model: options.models.large }),
          durationMs: compileMs,
        });
      }

      const surfaceId = options.surfaceIdFor(event.toolCall);
      const existingTemplateId = rendered.get(surfaceId) ?? null;
      if (result.surface !== null && result.templateId !== null) {
        rendered.set(surfaceId, result.templateId);
      }

      return {
        event: toGenerativeUIEvent(result, {
          surfaceId,
          catalogId: options.catalog.id,
          data: event.result,
          existingTemplateId,
        }),
        trace,
      };
    },
  };
}
