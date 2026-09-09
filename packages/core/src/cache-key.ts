export type IntentClass =
  | "browse"
  | "detail"
  | "compare"
  | "filter"
  /**
   * 用户想**执行一个操作**，而不是查看信息。
   *
   * 这一类不能并进 detail：「放《X》」和「《X》讲什么」的 tool 签名与数据形状
   * 完全相同，若意图也相同，缓存键就区分不了它们——而它们需要不同的动作。
   * 意图类目必须细到能区分实质不同的结果。
   */
  | "act"
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
export type BaseCacheKeyInput = Omit<CacheKeyInput, "variantId">;

/** 不含变体维度的意图键。变体池以它为作用域。 */
export function baseCacheKeyOf(input: BaseCacheKeyInput): string {
  return [
    `${input.catalogId}@${input.catalogVersion}`,
    input.toolSig,
    input.dataShape,
    input.intentClass,
    `flow=${input.flowContext ?? "-"}`,
  ].join("|");
}

export function cacheKeyOf(input: CacheKeyInput): string {
  return `${baseCacheKeyOf(input)}|variant=${input.variantId}`;
}
