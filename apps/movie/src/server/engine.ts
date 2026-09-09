import { createCompileMiddleware } from "@next-a2ui/adapter";
import { type CompileEvent, Compiler, MemoryCacheStore, MemoryVariantPool } from "@next-a2ui/core";
import { createAISDKClient, createIntentClassifier } from "@next-a2ui/llm";
import { buildMovieCatalog } from "./catalog.ts";
import { tiers } from "./models.ts";

export const compileLog: CompileEvent[] = [];

const compiler = new Compiler({
  cache: new MemoryCacheStore(),
  llm: createAISDKClient({ model: tiers.large }),
  variants: new MemoryVariantPool(),
  telemetry: {
    compiled: (event) => {
      compileLog.unshift(event);
      compileLog.length = Math.min(compileLog.length, 20);
    },
    interacted: () => {},
  },
});

/**
 * 中间件状态是会话级的。demo 里用模块级单例（单用户），生产上应当一个客户端
 * 连接一个实例——页面重载会新建连接、新建实例，因而重新发 createSurface。
 */
export const middleware = createCompileMiddleware({
  compiler,
  classifier: createIntentClassifier({ model: tiers.small }),
  catalog: buildMovieCatalog(),
  // 按 tool 调用的形状分配 slot：不同意图落在不同 surface 上，各自独立
  // 缓存与降级。同一个 slot 反复更新则复用组件树。
  surfaceIdFor: (toolCall) =>
    `slot:${toolCall.name}:${Object.keys(toolCall.args).sort().join("-") || "all"}`,
});
