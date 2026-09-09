import { describe, expect, test } from "bun:test";
import { SurfaceStore } from "../src/surface-store.ts";

const createSurface = {
  version: "v1.0",
  createSurface: {
    surfaceId: "slot-a",
    catalogId: "movie-web",
    components: [{ id: "root", component: "MovieList", movies: { path: "/data" } }],
    dataModel: { data: [{ id: 1, title: "沙丘" }] },
  },
};

describe("SurfaceStore", () => {
  test("createSurface 建立组件树与数据模型", () => {
    const store = new SurfaceStore();

    store.apply(createSurface);

    const surface = store.get("slot-a");
    expect(surface?.components.get("root")?.component).toBe("MovieList");
    expect(surface?.dataModel).toEqual({ data: [{ id: 1, title: "沙丘" }] });
  });

  test("updateDataModel 只换数据，组件树保持同一个对象", () => {
    const store = new SurfaceStore();
    store.apply(createSurface);
    const before = store.get("slot-a")?.components;

    store.apply({
      version: "v1.0",
      updateDataModel: { surfaceId: "slot-a", path: "/data", value: [{ id: 2, title: "沙丘 2" }] },
    });

    const after = store.get("slot-a");
    // 组件树未被重建——这是"结构可缓存"在运行时的体现，也是重渲染范围的下限
    expect(after?.components).toBe(before);
    expect(after?.dataModel).toEqual({ data: [{ id: 2, title: "沙丘 2" }] });
  });

  test("对未知 surface 的更新被忽略而不是抛出", () => {
    const store = new SurfaceStore();

    expect(() =>
      store.apply({
        version: "v1.0",
        updateDataModel: { surfaceId: "ghost", path: "/data", value: [] },
      }),
    ).not.toThrow();
    expect(store.get("ghost")).toBeUndefined();
  });
});
