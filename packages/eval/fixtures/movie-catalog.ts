import { assertNoDrift, createProjectFromTsConfig, extractContracts } from "@next-a2ui/contract";
import type { Catalog } from "@next-a2ui/core";
import { movieActions, movieContracts } from "@next-a2ui/movie/src/contracts.ts";

/**
 * 影视 catalog 从**真实组件源码**推导，不是手写的。
 *
 * 手写契约会往乐观方向漂移（想当然地以为组件只要 title 和 poster），抽取器
 * 说的是组件类型的实话。任何漂移都会让这里抛出，从而让 eval 与 CI 一起失败。
 */
export function buildMovieCatalog(): Catalog {
  const project = createProjectFromTsConfig(
    new URL("../../../tsconfig.json", import.meta.url).pathname,
  );
  const components = assertNoDrift(extractContracts({ project, declarations: movieContracts }));

  return { id: "movie-web", version: "1.0.0", components, actions: movieActions };
}
