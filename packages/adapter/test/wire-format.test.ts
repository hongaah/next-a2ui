import { describe, expect, test } from "bun:test";
import type { CompileResult } from "@next-a2ui/core";
import { toA2UIMessages } from "../src/messages.ts";

const result: CompileResult = {
  actions: [],
  surface: {
    rootId: "root",
    components: [{ id: "root", component: "MovieList", bindings: { movies: { path: "/" } } }],
  },
  source: "L2",
  templateId: "tpl",
  capabilityGap: null,
  degraded: null,
};

const movies = [{ id: 1, title: "沙丘" }];
const options = { surfaceId: "slot-a", catalogId: "movie-web", data: movies };

describe("A2UI 线格式翻译", () => {
  test("绑定内联成组件属性，不保留 bindings 子对象", () => {
    const created = toA2UIMessages(result, options)[0]?.createSurface as {
      components: Array<Record<string, unknown>>;
    };

    expect(created.components[0]).toEqual({
      id: "root",
      component: "MovieList",
      movies: { path: "/data" },
    });
  });

  test("根数据模型必须是对象，tool 结果挂在 /data 下", () => {
    const created = toA2UIMessages(result, options)[0]?.createSurface as {
      dataModel: unknown;
    };

    expect(created.dataModel).toEqual({ data: movies });
  });

  test("数据更新同样写到 /data，不覆盖整个根模型", () => {
    const message = toA2UIMessages(result, { ...options, existingSurface: true })[0];

    expect(message?.updateDataModel).toEqual({
      surfaceId: "slot-a",
      path: "/data",
      value: movies,
    });
  });

  test("子作用域路径不受影响", () => {
    const childScoped: CompileResult = {
      ...result,
      surface: {
        rootId: "root",
        components: [
          { id: "root", component: "MovieList", bindings: { label: { path: "title" } } },
        ],
      },
    };

    const created = toA2UIMessages(childScoped, options)[0]?.createSurface as {
      components: Array<Record<string, unknown>>;
    };

    expect(created.components[0]?.label).toEqual({ path: "title" });
  });
});
