import { describe, expect, test } from "bun:test";
import type { Catalog, ComponentContract } from "@next-a2ui/core";
import { toA2UICatalog } from "../src/catalog.ts";

const movieList: ComponentContract = {
  id: "MovieList",
  dataProp: "movies",
  accepts: { type: "array", items: { type: "object", required: ["title"] } },
  emits: [{ name: "select" }],
  semantics: { use: "信息密集的影片行列表", avoid: "以视觉发现为目的时不要用" },
  density: "compact",
};

const catalog: Catalog = { id: "movie-web", version: "1.0.0", components: [movieList] };

describe("toA2UICatalog", () => {
  test("每个组件带 const 判别式，且 component 与数据 prop 都是必需的", () => {
    const doc = toA2UICatalog(catalog);

    expect(doc.components.MovieList).toMatchObject({
      type: "object",
      properties: { component: { const: "MovieList" } },
      required: ["component", "movies"],
    });
  });

  test("语义描述写进 description，供模型与其它 renderer 使用", () => {
    const doc = toA2UICatalog(catalog);
    const component = doc.components.MovieList as { description?: string };

    expect(component.description).toContain("信息密集的影片行列表");
    expect(component.description).toContain("以视觉发现为目的时不要用");
  });

  test("$defs 只含 anyComponent 与 anyFunction —— 规范禁止其它键", () => {
    const doc = toA2UICatalog(catalog);

    expect(Object.keys(doc.$defs).sort()).toEqual(["anyComponent", "anyFunction"]);
  });

  test("没有函数时 anyFunction 是 false，不是空 oneOf", () => {
    // 空的 oneOf: [] 不是合法 JSON Schema，会让整份 catalog 无法被 ajv 编译
    const doc = toA2UICatalog(catalog);

    expect(doc.$defs.anyFunction).toBe(false);
  });

  test("catalogId 与协议版本正确", () => {
    const doc = toA2UICatalog(catalog);

    expect(doc.catalogId).toBe("movie-web");
    expect(doc.protocolVersion).toBe("v1.0");
  });
});
