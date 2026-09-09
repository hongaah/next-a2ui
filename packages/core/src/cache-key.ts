export type IntentClass =
  | "browse"
  | "detail"
  | "compare"
  | "filter"
  | "confirm"
  | "edit"
  | "explain";

export interface CacheKeyInput {
  readonly toolSig: string;
  readonly dataShape: string;
  readonly intentClass: IntentClass;
  readonly variantId: string;
  readonly flowContext: string | null;
  readonly catalogId: string;
  readonly catalogVersion: string;
}

/**
 * 组装缓存键。
 *
 * 刻意保持可读而不做 hash：命中率要能按意图归因，dashboard 上要能一眼看出
 * 哪个意图在反复未命中。key 变长的代价远小于失去可调试性。
 */
export function cacheKeyOf(input: CacheKeyInput): string {
  return [
    `${input.catalogId}@${input.catalogVersion}`,
    input.toolSig,
    input.dataShape,
    input.intentClass,
    `variant=${input.variantId}`,
    `flow=${input.flowContext ?? "-"}`,
  ].join("|");
}
