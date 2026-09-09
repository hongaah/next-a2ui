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
  // 意图分类走哪一档可配置。架构上它该走便宜的那档（每个请求都要跑），
  // 但便宜不等于快——本机 Ollama 是 CPU 推理，实测比网关慢一个数量级。
  // 默认走网关保证 demo 体感，NEXT_A2UI_INTENT_TIER=small 可切回本地。
  classifier: createIntentClassifier({
    model: process.env.NEXT_A2UI_INTENT_TIER === "small" ? tiers.small : tiers.large,
  }),
  catalog: buildMovieCatalog(),
  // 按 tool 调用的形状分配 slot：不同意图落在不同 surface 上，各自独立
  // 缓存与降级。同一个 slot 反复更新则复用组件树。
  surfaceIdFor: (toolCall) =>
    `slot:${toolCall.name}:${Object.keys(toolCall.args).sort().join("-") || "all"}`,
  models: {
    small: process.env.NEXT_A2UI_INTENT_TIER === "small" ? tiers.labels.small : tiers.labels.large,
    large: tiers.labels.large,
  },
});
