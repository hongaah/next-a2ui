import { describe, expect, test } from "bun:test";
import type { ComponentContract } from "../src/contract.ts";
import { describeShape } from "../src/data-shape.ts";
import type { SurfaceTemplate } from "../src/surface.ts";
import { validateTemplate } from "../src/validate-template.ts";

const movieRow: ComponentContract = {
  id: "MovieRow",
  accepts: { type: "array", items: { type: "object", required: ["title"] } },
  emits: [{ name: "select" }],
  semantics: { use: "以行列表展示影片", avoid: "" },
  density: "normal",
};

const shape = describeShape([{ id: 1, title: "Dune" }]);
const context = { components: [movieRow], shape };

describe("validateTemplate", () => {
  test("合法模板没有错误", () => {
    const template: SurfaceTemplate = {
      rootId: "root",
      components: [{ id: "root", component: "MovieRow" }],
    };

    expect(validateTemplate(template, context)).toEqual([]);
  });

  test("引用 catalog 之外的组件时报错", () => {
    const template: SurfaceTemplate = {
      rootId: "root",
      components: [{ id: "root", component: "TimelineChart" }],
    };

    expect(validateTemplate(template, context)).toEqual([
      { kind: "unknown-component", componentId: "root", detail: "TimelineChart" },
    ]);
  });
});

describe("validateTemplate id 引用完整性", () => {
  test("children 指向不存在的节点时报错", () => {
    const template: SurfaceTemplate = {
      rootId: "root",
      components: [{ id: "root", component: "MovieRow", children: ["ghost"] }],
    };

    expect(validateTemplate(template, context)).toEqual([
      { kind: "unknown-child", componentId: "root", detail: "ghost" },
    ]);
  });

  test("rootId 不在组件列表中时报错", () => {
    const template: SurfaceTemplate = {
      rootId: "missing",
      components: [{ id: "root", component: "MovieRow" }],
    };

    expect(validateTemplate(template, context)).toEqual([
      { kind: "missing-root", componentId: "missing", detail: "rootId 不在 components 中" },
    ]);
  });
});

describe("validateTemplate 绑定悬空", () => {
  test("子作用域绑定到数据保证字段时合法", () => {
    const template: SurfaceTemplate = {
      rootId: "root",
      components: [{ id: "root", component: "MovieRow", bindings: { label: { path: "title" } } }],
    };

    expect(validateTemplate(template, context)).toEqual([]);
  });

  test("根作用域绑定到整个数组时合法", () => {
    const template: SurfaceTemplate = {
      rootId: "root",
      components: [{ id: "root", component: "MovieRow", bindings: { items: { path: "/" } } }],
    };

    expect(validateTemplate(template, context)).toEqual([]);
  });

  test("绑定到数据没有的字段时报悬空", () => {
    const template: SurfaceTemplate = {
      rootId: "root",
      components: [
        { id: "root", component: "MovieRow", bindings: { label: { path: "director" } } },
      ],
    };

    expect(validateTemplate(template, context)).toEqual([
      { kind: "dangling-binding", componentId: "root", detail: "director" },
    ]);
  });

  test("单对象数据上，根作用域绑定到不存在的字段时报悬空", () => {
    const objectContext = {
      components: [movieRow],
      shape: describeShape({ id: 1, title: "Dune" }),
    };
    const template: SurfaceTemplate = {
      rootId: "root",
      components: [
        { id: "root", component: "MovieRow", bindings: { label: { path: "/director" } } },
      ],
    };

    expect(validateTemplate(template, objectContext)).toEqual([
      { kind: "dangling-binding", componentId: "root", detail: "/director" },
    ]);
  });
});
