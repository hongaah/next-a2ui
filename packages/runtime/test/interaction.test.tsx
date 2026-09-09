import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { ActionMessage } from "../src/dispatch.ts";
import { SurfaceStore } from "../src/surface-store.ts";
import { A2UISurfaceView, type ComponentRegistry } from "../src/surface-view.tsx";

/** 渲染时立刻触发一次回调，用来在静态渲染里模拟用户点击。 */
function AutoFire({ play }: { play?: (payload: unknown) => void }) {
  play?.({ movieId: 7 });
  return <div>已触发</div>;
}

const registry: ComponentRegistry = { MovieList: { component: AutoFire as never } };

function surfaceWith(component: Record<string, unknown>) {
  const store = new SurfaceStore();
  store.apply({
    version: "v1.0",
    createSurface: {
      surfaceId: "slot-a",
      catalogId: "movie-web",
      components: [component],
      dataModel: { data: [] },
    },
  });
  const surface = store.get("slot-a");
  if (surface === undefined) throw new Error("surface 未建立");
  return surface;
}

describe("卡片交互回传 agent", () => {
  test("带 Action 声明的属性变成回调，触发后产出规范回传消息", () => {
    const sent: ActionMessage[] = [];
    const surface = surfaceWith({
      id: "root",
      component: "MovieList",
      play: { event: { name: "play", userMessage: "播放这部片" } },
    });

    renderToStaticMarkup(
      <A2UISurfaceView
        surface={surface}
        registry={registry}
        onDispatch={(message) => sent.push(message)}
      />,
    );

    expect(sent).toHaveLength(1);
    expect(sent[0]?.action).toMatchObject({
      name: "play",
      userMessage: "播放这部片",
      surfaceId: "slot-a",
      sourceComponentId: "root",
      context: { movieId: 7 },
    });
  });

  test("Action 对象不会被当成普通属性漏给宿主组件", () => {
    const surface = surfaceWith({
      id: "root",
      component: "MovieList",
      play: { event: { name: "play" } },
    });

    const html = renderToStaticMarkup(<A2UISurfaceView surface={surface} registry={registry} />);

    expect(html).toBe("<div>已触发</div>");
  });
});
