import { createModelTiersFromEnv } from "@next-a2ui/llm";

/**
 * 模型分层：意图分类每个请求都跑，走本地小模型；L2 编译只在缓存未命中时跑，
 * 走网关上的大模型。把高频的那档放本地，成本曲线才压得下去。
 */
export const tiers = createModelTiersFromEnv(process.env);

/** 展示用的模型名。 */
export const modelLabels = tiers.labels;
