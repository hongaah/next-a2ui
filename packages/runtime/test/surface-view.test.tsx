import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SurfaceStore } from "../src/surface-store.ts";
import type { ComponentRegistry } from "../src/surface-view.tsx";
import { A2UISurfaceView } from "../src/surface-view.tsx";

function MovieList({ movies }: { movies?: Array<{ id: number; title: string }> }) {
  return (
    <ul>
      {movies?.map((m) => (
        <li key={m.id}>{m.title}</li>
      ))}
    </ul>
  );
}

function Panel({ children }: { children?: React.ReactNode }) {
  return <section>{children}</section>;
}

const registry: ComponentRegistry = {
  MovieList: { component: MovieList as never, emits: ["select"] },
  Panel: { component: Panel as never },
};

function surfaceWith(components: unknown[], dataModel: unknown) {
  const store = new SurfaceStore();
  store.apply({
    version: "v1.0",
    createSurface: { surfaceId: "s", catalogId: "movie-web", components, dataModel },
  });
  const surface = store.get("s");
  if (surface === undefined) throw new Error("surface 未建立");
  return surface;
}

describe("A2UISurfaceView", () => {
  test("渲染根组件，绑定已解析成实际数据", () => {
    const surface = surfaceWith(
      [{ id: "root", component: "MovieList", movies: { path: "/data" } }],
      { data: [{ id: 1, title: "沙丘" }] },
    );

    const html = renderToStaticMarkup(<A2UISurfaceView surface={surface} registry={registry} />);

    expect(html).toBe("<ul><li>沙丘</li></ul>");
  });

  test("children 递归渲染", () => {
    const surface = surfaceWith(
      [
        { id: "root", component: "Panel", children: ["list"] },
        { id: "list", component: "MovieList", movies: { path: "/data" } },
      ],
      { data: [{ id: 1, title: "沙丘" }] },
    );

    const html = renderToStaticMarkup(<A2UISurfaceView surface={surface} registry={registry} />);

    expect(html).toBe("<section><ul><li>沙丘</li></ul></section>");
  });

  test("注册表里没有的组件不让整个 slot 崩掉", () => {
    const surface = surfaceWith([{ id: "root", component: "TimelineChart" }], { data: [] });

    const html = renderToStaticMarkup(<A2UISurfaceView surface={surface} registry={registry} />);

    expect(html).toContain("TimelineChart");
  });
});
