import { buildMovieCatalog } from "../server/catalog.ts";
import { MovieBrowser } from "./movie-browser.tsx";

export const dynamic = "force-dynamic";

/**
 * 服务端构建 catalog（契约抽取用 ts-morph，只能在服务端跑），把可序列化的
 * 组件契约传给客户端。客户端据此拼出渲染注册表——语义事件从契约来，不重复声明。
 */
export default function Home() {
  const catalog = buildMovieCatalog();
  return <MovieBrowser contracts={catalog.components} />;
}
