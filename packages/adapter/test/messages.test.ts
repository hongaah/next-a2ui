import { describe, expect, test } from "bun:test";
import type { CompileResult } from "@next-a2ui/core";
import { toA2UIMessages } from "../src/messages.ts";

const surface: CompileResult = {
  actions: [],
  surface: {
    rootId: "root",
    components: [{ id: "root", component: "MovieList", bindings: { movies: { path: "/" } } }],
  },
  source: "L2",
  templateId: "tpl-1",
  capabilityGap: null,
  degraded: null,
};

const movies = [{ id: 1, title: "沙丘" }];
const options = { surfaceId: "slot-a", catalogId: "movie-web", data: movies };

describe("toA2UIMessages 结构与数据分离", () => {
  test("首次编译产出 createSurface，组件树里不含任何数据取值", () => {
    const messages = toA2UIMessages(surface, options);

    expect(messages).toEqual([
      {
        version: "v1.0",
        createSurface: {
          surfaceId: "slot-a",
          catalogId: "movie-web",
          components: [{ id: "root", component: "MovieList", bindings: { movies: { path: "/" } } }],
          dataModel: movies,
        },
      },
    ]);
  });

  test("命中缓存时只发 updateDataModel，不重发组件树", () => {
    const hit: CompileResult = { ...surface, source: "L0" };

    const messages = toA2UIMessages(hit, { ...options, existingSurface: true });

    expect(messages).toEqual([
      { version: "v1.0", updateDataModel: { surfaceId: "slot-a", path: "/", value: movies } },
    ]);
  });
});
