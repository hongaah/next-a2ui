/**
 * 构建期抽取契约，产出 catalog JSON。
 *
 * 契约抽取靠 ts-morph 读源码，是**构建期**行为（spec §6）。放进运行时会把
 * 整个 TypeScript 编译器拖进应用 bundle，而且漂移要等到请求时才炸——那时已经
 * 太晚了。这里让它在构建期炸。
 */
import { assertNoDrift, createProjectFromTsConfig, extractContracts } from "@next-a2ui/contract";
import { movieActions, movieContracts } from "../apps/movie/src/contracts.ts";

const project = createProjectFromTsConfig(new URL("../tsconfig.json", import.meta.url).pathname);
const components = assertNoDrift(extractContracts({ project, declarations: movieContracts }));

const catalog = { id: "movie-web", version: "1.0.0", components, actions: movieActions };
const target = new URL("../apps/movie/src/generated/catalog.json", import.meta.url).pathname;
await Bun.write(target, `${JSON.stringify(catalog, null, 2)}\n`);

console.log(`catalog 已生成：${components.length} 个组件、${movieActions.length} 个动作`);
for (const component of components) {
  console.log(
    `  ${component.id}  data=${component.dataProp}  emits=[${component.emits.map((e) => e.name).join()}]`,
  );
}
