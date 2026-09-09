import { describe, expect, test } from "bun:test";
import type { CompileResult } from "@next-a2ui/core";
import { toA2UIMessages } from "../src/messages.ts";

const options = { surfaceId: "slot-a", catalogId: "movie-web", data: [] };

function resultWith(components: CompileResult["surface"]): CompileResult {
  return {
    actions: [],
    surface: components,
    source: "L2",
    templateId: "tpl",
    capabilityGap: null,
    degraded: null,
  };
}

describe("A2UI v1.0 要求根节点 id 必须是 root", () => {
  test("模型自取的根节点 id 被改写成 root", () => {
    const messages = toA2UIMessages(
      resultWith({
        rootId: "MovieList",
        components: [
          { id: "MovieList", component: "MovieList", bindings: { movies: { path: "/" } } },
        ],
      }),
      options,
    );

    const created = messages[0]?.createSurface as { components: Array<{ id: string }> };
    expect(created.components.map((c) => c.id)).toEqual(["root"]);
  });

  test("指向原根节点的 children 引用被同步改写", () => {
    const messages = toA2UIMessages(
      resultWith({
        rootId: "shell",
        components: [
          { id: "shell", component: "Column", children: ["list"] },
          { id: "list", component: "MovieList" },
        ],
      }),
      options,
    );

    const created = messages[0]?.createSurface as {
      components: Array<{ id: string; component: string; children?: string[] }>;
    };
    expect(created.components).toEqual([
      { id: "root", component: "Column", children: ["list"] },
      { id: "list", component: "MovieList" },
    ]);
  });

  test("已有节点占用了 root 这个 id 时，先把它让开", () => {
    const messages = toA2UIMessages(
      resultWith({
        rootId: "shell",
        components: [
          { id: "shell", component: "Column", children: ["root"] },
          { id: "root", component: "MovieList" },
        ],
      }),
      options,
    );

    const created = messages[0]?.createSurface as {
      components: Array<{ id: string; component: string; children?: string[] }>;
    };
    // 原来那个叫 root 的节点必须改名，且 shell 对它的引用同步更新
    expect(created.components[0]?.id).toBe("root");
    expect(created.components[0]?.component).toBe("Column");
    expect(created.components[1]?.id).not.toBe("root");
    expect(created.components[0]?.children).toEqual([created.components[1]?.id ?? ""]);
  });
});
