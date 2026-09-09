import { describe, expect, test } from "bun:test";
import { resolveProps } from "../src/resolve-props.ts";

const dataModel = { data: { movies: [{ id: 1, title: "沙丘" }], total: 1 } };

describe("resolveProps", () => {
  test("路径绑定被解析成实际值", () => {
    const props = resolveProps(
      { id: "root", component: "MovieList", movies: { path: "/data/movies" } },
      dataModel,
    );

    expect(props.movies).toEqual([{ id: 1, title: "沙丘" }]);
  });

  test("字面量属性原样保留", () => {
    const props = resolveProps(
      { id: "root", component: "MovieList", title: "热映中", compact: true },
      dataModel,
    );

    expect(props).toMatchObject({ title: "热映中", compact: true });
  });

  test("id 与 component 不作为 props 传给宿主组件", () => {
    const props = resolveProps({ id: "root", component: "MovieList" }, dataModel);

    expect(props).not.toHaveProperty("id");
    expect(props).not.toHaveProperty("component");
  });

  test("解析不到的路径给 undefined，不抛出", () => {
    const props = resolveProps(
      { id: "root", component: "MovieList", movies: { path: "/data/ghost/deep" } },
      dataModel,
    );

    expect(props.movies).toBeUndefined();
  });

  test("根路径解析成整个数据模型", () => {
    const props = resolveProps({ id: "root", component: "X", all: { path: "/" } }, dataModel);

    expect(props.all).toEqual(dataModel);
  });
});
