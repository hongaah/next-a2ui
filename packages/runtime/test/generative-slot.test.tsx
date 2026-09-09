import { describe, expect, test } from "bun:test";
import type { GenerativeUIEvent } from "@next-a2ui/adapter";
import { renderToStaticMarkup } from "react-dom/server";
import { GenerativeSlot } from "../src/generative-slot.tsx";
import type { ComponentRegistry } from "../src/surface-view.tsx";

function MovieList({ movies }: { movies?: Array<{ id: number; title: string }> }) {
  return (
    <ul>
      {movies?.map((m) => (
        <li key={m.id}>{m.title}</li>
      ))}
    </ul>
  );
}

const registry: ComponentRegistry = { MovieList: { component: MovieList as never } };
const classic = <p>经典视图</p>;

const compiled: GenerativeUIEvent = {
  type: "CUSTOM",
  name: "next-a2ui.compiled",
  value: {
    surfaceId: "slot-a",
    messages: [
      {
        version: "v1.0",
        createSurface: {
          surfaceId: "slot-a",
          catalogId: "movie-web",
          components: [{ id: "root", component: "MovieList", movies: { path: "/data" } }],
          dataModel: { data: [{ id: 1, title: "沙丘" }] },
        },
      },
    ],
    actions: [],
    source: "L2",
    degraded: null,
    capabilityGap: null,
  },
};

const render = (node: React.ReactElement) => renderToStaticMarkup(node);

describe("GenerativeSlot", () => {
  test("编译成功时渲染生成内容", () => {
    const html = render(<GenerativeSlot event={compiled} registry={registry} fallback={classic} />);

    expect(html).toContain("沙丘");
    expect(html).not.toContain("经典视图");
  });

  test("还没有编译结果时渲染宿主兜底", () => {
    const html = render(<GenerativeSlot event={null} registry={registry} fallback={classic} />);

    expect(html).toContain("经典视图");
  });

  test("编译降级时渲染宿主兜底而不是空白", () => {
    const degraded: GenerativeUIEvent = {
      ...compiled,
      value: {
        ...compiled.value,
        messages: [],
        source: "fallback",
        degraded: { stage: "compile-error", message: "模型超时" },
      },
    };

    const html = render(<GenerativeSlot event={degraded} registry={registry} fallback={classic} />);

    expect(html).toContain("经典视图");
  });

  test("capability gap 时同样渲染宿主兜底", () => {
    const gap: GenerativeUIEvent = {
      ...compiled,
      value: {
        ...compiled.value,
        messages: [],
        source: "gap",
        capabilityGap: {
          cacheKey: "k",
          reason: "no-candidates",
          dataShape: "scalar:number",
          intentClass: "explain",
        },
      },
    };

    const html = render(<GenerativeSlot event={gap} registry={registry} fallback={classic} />);

    expect(html).toContain("经典视图");
  });

  test("用户切回经典视图后，即使有生成内容也不再渲染它", () => {
    const html = render(
      <GenerativeSlot event={compiled} registry={registry} fallback={classic} classic />,
    );

    expect(html).toContain("经典视图");
    expect(html).not.toContain("沙丘");
  });
});
