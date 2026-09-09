import { baseCacheKeyOf, type IntentClass } from "./cache-key.ts";
import { dataShape } from "./data-shape.ts";
import { type ToolCall, toolSignature } from "./tool-signature.ts";

/** 定位一个意图（不含变体维度）所需的信息。 */
export interface VariantScope {
  readonly toolCall: ToolCall;
  readonly data: unknown;
  readonly intentClass: IntentClass;
  readonly catalog: { readonly id: string; readonly version: string };
  readonly flowContext?: string | null;
}

export function variantScopeKey(scope: VariantScope): string {
  return baseCacheKeyOf({
    toolSig: toolSignature(scope.toolCall),
    dataShape: dataShape(scope.data),
    intentClass: scope.intentClass,
    flowContext: scope.flowContext ?? null,
    catalogId: scope.catalog.id,
    catalogVersion: scope.catalog.version,
  });
}

/**
 * 同一意图下已知的呈现变体。
 *
 * 个性化的成本是「缓存条目数 × 变体数」，不是「× 用户数」——按用户画像簇缓存，
 * 不按用户缓存。MVP 只维护池与手动选择，bandit 后续接上即有历史数据。
 */
export interface VariantPool {
  register(scope: VariantScope, variantId: string): Promise<void>;
  list(scope: VariantScope): Promise<readonly string[]>;
}

export class MemoryVariantPool implements VariantPool {
  readonly #pools = new Map<string, Set<string>>();

  async register(scope: VariantScope, variantId: string): Promise<void> {
    const key = variantScopeKey(scope);
    const pool = this.#pools.get(key) ?? new Set<string>();
    pool.add(variantId);
    this.#pools.set(key, pool);
  }

  async list(scope: VariantScope): Promise<readonly string[]> {
    return [...(this.#pools.get(variantScopeKey(scope)) ?? [])];
  }
}
