import type { IntentClass } from "./cache-key.ts";

/**
 * 一次编译的结构化记录。命中率、成本、延迟、gap 率四类指标都从这里聚合。
 * 从第一天就位，不列为"以后补"。
 */
export interface CompileEvent {
  readonly cacheKey: string;
  readonly intentClass: IntentClass;
  readonly variantId: string;
  readonly source: "L0" | "L2" | "gap" | "fallback";
  readonly componentCandidates: number;
  readonly actionCandidates: number;
  readonly durationMs: number;
  readonly degraded: string | null;
}

/**
 * 用户与生成界面的交互。MVP 只记录不使用——bandit 上线时需要历史数据，
 * 而埋点越晚补越难（要回溯、要对齐口径）。
 */
export interface InteractionEvent {
  readonly templateId: string;
  readonly variantId: string;
  readonly kind: "impression" | "select" | "complete" | "dwell";
  readonly value?: number;
}

export interface TelemetrySink {
  compiled(event: CompileEvent): void;
  interacted(event: InteractionEvent): void;
}

export const noopTelemetry: TelemetrySink = {
  compiled: () => {},
  interacted: () => {},
};
