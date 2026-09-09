import { describe, expect, test } from "bun:test";
import type { ComponentContract } from "@next-a2ui/core";
import { createRegistry } from "../src/create-registry.ts";

const contract = (id: string, emits: string[]): ComponentContract => ({
  id,
  dataProp: "movies",
  accepts: { type: "array", items: { type: "object", required: ["title"] } },
  emits: emits.map((name) => ({ name })),
  semantics: { use: id, avoid: "" },
  density: "normal",
});

const Stub = () => null;

describe("createRegistry", () => {
  test("语义事件从契约带进注册表", () => {
    const registry = createRegistry([contract("MovieList", ["select"])], { MovieList: Stub });

    expect(registry.MovieList?.emits).toEqual(["select"]);
  });

  test("契约声明了但宿主没提供实现的组件不进注册表", () => {
    const registry = createRegistry([contract("MovieList", []), contract("MovieGrid", [])], {
      MovieList: Stub,
    });

    expect(Object.keys(registry)).toEqual(["MovieList"]);
  });
});
