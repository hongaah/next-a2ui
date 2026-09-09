import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

/**
 * 规范化 OpenAI 兼容端点的 base URL。
 *
 * `/v1/models` 是**模型列表**端点，不是 base URL——直接拿去用会被拼成
 * `/v1/models/chat/completions`，失败方式还不直观（404 而非明确报错）。
 */
export function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "").replace(/\/models$/, "");
}

export interface ModelTiers {
  /** 高频小任务：意图分类。本地小模型，零成本零网络。 */
  readonly small: LanguageModel;
  /** 低频大任务：L2 编译。只在缓存未命中时被叫醒。 */
  readonly large: LanguageModel;
  /** 展示用的模型名，供追踪把「哪一步用了哪个模型」摊开给人看。 */
  readonly labels: { readonly small: string; readonly large: string };
}

export interface TierConfig {
  readonly smallBaseUrl?: string;
  readonly smallModel?: string;
  readonly largeBaseUrl?: string;
  readonly largeModel?: string;
  readonly apiKey?: string;
}

const DEFAULTS = {
  smallBaseUrl: "http://localhost:11434/v1",
  smallModel: "qwen3:1.7b",
  largeBaseUrl: "http://aiproxy.ugreencloud.com/qwen35/v1",
  largeModel: "Qwen3.5-35B-A3B-GGUF",
} as const;

/**
 * 按成本结构分层接线：意图分类每个请求都跑，走本地 1.7b；L2 编译只在缓存
 * 未命中时跑，走 35B。把高频的那档放本地，成本曲线才真正压得下去。
 */
export function createModelTiers(config: TierConfig = {}): ModelTiers {
  const apiKey = config.apiKey ?? "not-needed";

  // supportsStructuredOutputs 是受约束解码的总闸。不开的话 AI SDK 不会把
  // JSON schema 作为 response_format 发出去，模型退回自由生成——候选集枚举
  // 就只是个事后校验，而不是解码期约束，整套"准"的保证随之落空。
  const smallProvider = createOpenAICompatible({
    name: "local",
    baseURL: normalizeBaseUrl(config.smallBaseUrl ?? DEFAULTS.smallBaseUrl),
    apiKey,
    supportsStructuredOutputs: true,
  });
  const largeProvider = createOpenAICompatible({
    name: "gateway",
    baseURL: normalizeBaseUrl(config.largeBaseUrl ?? DEFAULTS.largeBaseUrl),
    apiKey,
    supportsStructuredOutputs: true,
  });

  const smallModel = config.smallModel ?? DEFAULTS.smallModel;
  const largeModel = config.largeModel ?? DEFAULTS.largeModel;

  return {
    small: smallProvider(smallModel),
    large: largeProvider(largeModel),
    labels: { small: `${smallModel} · 本地`, large: `${largeModel} · 网关` },
  };
}

/** 从环境变量读取分层配置。 */
export function createModelTiersFromEnv(env: Record<string, string | undefined>): ModelTiers {
  return createModelTiers({
    ...(env.NEXT_A2UI_SMALL_BASE_URL === undefined
      ? {}
      : { smallBaseUrl: env.NEXT_A2UI_SMALL_BASE_URL }),
    ...(env.NEXT_A2UI_SMALL_MODEL === undefined ? {} : { smallModel: env.NEXT_A2UI_SMALL_MODEL }),
    ...(env.AICONSOLE_OPENAI_HTTP_BASE_URL === undefined
      ? {}
      : { largeBaseUrl: env.AICONSOLE_OPENAI_HTTP_BASE_URL }),
    ...(env.NEXT_A2UI_LARGE_MODEL === undefined ? {} : { largeModel: env.NEXT_A2UI_LARGE_MODEL }),
    ...(env.AICONSOLE_OPENAI_API_KEY === undefined ? {} : { apiKey: env.AICONSOLE_OPENAI_API_KEY }),
  });
}
