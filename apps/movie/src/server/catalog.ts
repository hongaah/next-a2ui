import type { Catalog } from "@next-a2ui/core";
import generated from "../generated/catalog.json" with { type: "json" };

/**
 * 构建期抽取出来的 catalog。
 *
 * 运行时只读 JSON，ts-morph 不进应用 bundle；契约与组件源码的漂移在
 * `bun run catalog` 时就会炸，而不是等到请求进来。
 */
export function buildMovieCatalog(): Catalog {
  return generated as unknown as Catalog;
}
