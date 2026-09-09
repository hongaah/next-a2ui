import type { ActionPlan } from "./action.ts";
import type { SurfaceTemplate } from "./surface.ts";

/** 缓存条目：无数据的结构模板 + 无实参的动作计划。两者都不含取值。 */
export interface CachedPlan {
  readonly templateId: string;
  readonly template: SurfaceTemplate | null;
  readonly actionPlans: readonly ActionPlan[];
}

export interface CacheStore {
  get(key: string): Promise<CachedPlan | undefined>;
  set(key: string, value: CachedPlan): Promise<void>;
}

/** 进程内实现。生产环境换 Redis 只需替换这一层。 */
export class MemoryCacheStore implements CacheStore {
  readonly #entries = new Map<string, CachedPlan>();

  async get(key: string): Promise<CachedPlan | undefined> {
    return this.#entries.get(key);
  }

  async set(key: string, value: CachedPlan): Promise<void> {
    this.#entries.set(key, value);
  }
}
