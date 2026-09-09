import type { Catalog, Compiler, IntentClass, ShapeDescriptor, ToolCall } from "@next-a2ui/core";
import { describeShape } from "@next-a2ui/core";
import { type GenerativeUIEvent, toGenerativeUIEvent } from "./event.ts";

/** 依赖倒置：adapter 不认识 packages/llm，只认识这个接口。 */
export interface IntentClassifier {
  classify(input: {
    userQuery: string;
    toolCall: ToolCall;
    shape: ShapeDescriptor;
  }): Promise<{ intentClass: IntentClass; degraded: boolean }>;
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
}): { onToolResult(event: ToolResultEvent): Promise<GenerativeUIEvent> } {
  // 记录每个 slot 上当前渲染的是哪个模板。只看 surfaceId 不够——模板换了却
  // 只发数据，客户端会拿旧组件树渲染新数据。
  //
  // 这份状态是**会话级**的：一个客户端连接对应一个中间件实例。页面重载会新建
  // 连接、新建实例，因而重新发 createSurface，这正是我们要的。
  const rendered = new Map<string, string>();

  return {
    async onToolResult(event: ToolResultEvent): Promise<GenerativeUIEvent> {
      const shape = describeShape(event.result);
      const intent = await options.classifier.classify({
        userQuery: event.userQuery,
        toolCall: event.toolCall,
        shape,
      });

      const result = await options.compiler.compile({
        toolCall: event.toolCall,
        data: event.result,
        intentClass: intent.intentClass,
        catalog: options.catalog,
      });

      const surfaceId = options.surfaceIdFor(event.toolCall);
      const existingTemplateId = rendered.get(surfaceId) ?? null;
      if (result.surface !== null && result.templateId !== null) {
        rendered.set(surfaceId, result.templateId);
      }

      return toGenerativeUIEvent(result, {
        surfaceId,
        catalogId: options.catalog.id,
        data: event.result,
        existingTemplateId,
      });
    },
  };
}
