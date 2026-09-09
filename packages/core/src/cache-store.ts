import type { SurfaceTemplate } from "./surface.ts";

export interface CachedTemplate {
  readonly templateId: string;
  readonly template: SurfaceTemplate;
}

export interface CacheStore {
  get(key: string): Promise<CachedTemplate | undefined>;
  set(key: string, value: CachedTemplate): Promise<void>;
}

/** 进程内实现。生产环境换 Redis 只需替换这一层。 */
export class MemoryCacheStore implements CacheStore {
  readonly #entries = new Map<string, CachedTemplate>();

  async get(key: string): Promise<CachedTemplate | undefined> {
    return this.#entries.get(key);
  }

  async set(key: string, value: CachedTemplate): Promise<void> {
    this.#entries.set(key, value);
  }
}
