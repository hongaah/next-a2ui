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
  test("首次编译产出 createSurface，携带组件树", () => {
    const messages = toA2UIMessages(surface, options);

    expect(messages).toHaveLength(1);
    const created = messages[0]?.createSurface as { components: unknown[]; surfaceId: string };
    expect(created.surfaceId).toBe("slot-a");
    expect(created.components).toHaveLength(1);
  });

  test("命中缓存时只发 updateDataModel，不重发组件树", () => {
    const hit: CompileResult = { ...surface, source: "L0" };

    const messages = toA2UIMessages(hit, { ...options, existingTemplateId: "tpl-1" });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toHaveProperty("updateDataModel");
    expect(messages[0]).not.toHaveProperty("createSurface");
  });
});
