import { describe, expect, test } from "bun:test";
import type { Catalog, CompileResult, ComponentContract } from "@next-a2ui/core";
import { Ajv2020 } from "ajv/dist/2020.js";
import { toA2UICatalog } from "../src/catalog.ts";
import { toA2UIMessages } from "../src/messages.ts";

const SPEC_DIR =
  "node_modules/.bun/@a2ui+web_core@0.10.7/node_modules/@a2ui/web_core/src/v1_0/schemas";

async function loadSchema(name: string): Promise<Record<string, unknown>> {
  return JSON.parse(await Bun.file(`${SPEC_DIR}/${name}`).text());
}

const movieList: ComponentContract = {
  id: "MovieList",
  dataProp: "movies",
  accepts: { type: "array", items: { type: "object", required: ["title"] } },
  emits: [{ name: "select" }],
  semantics: { use: "影片行列表", avoid: "" },
  density: "compact",
};

const catalog: Catalog = { id: "movie-web", version: "1.0.0", components: [movieList] };

const result: CompileResult = {
  actions: [],
  surface: {
    rootId: "MovieList",
    components: [{ id: "MovieList", component: "MovieList", bindings: { movies: { path: "/" } } }],
  },
  source: "L2",
  templateId: "tpl",
  capabilityGap: null,
  degraded: null,
};

async function validator() {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  ajv.addSchema(await loadSchema("common_types.json"));
  ajv.addSchema({
    ...toA2UICatalog(catalog),
    $id: "https://a2ui.org/specification/v1_0/catalog.json",
  });
  return ajv.compile(await loadSchema("agent_to_renderer.json"));
}

describe("产出的消息符合 A2UI v1.0 官方 schema", () => {
  test("createSurface 消息通过官方 schema 校验", async () => {
    const validate = await validator();
    const [message] = toA2UIMessages(result, {
      surfaceId: "slot-a",
      catalogId: "movie-web",
      data: [{ id: 1, title: "沙丘" }],
    });

    const ok = validate(message);
    if (!ok)
      console.error(
        JSON.stringify(
          (validate.errors ?? []).filter((e) => e.schemaPath.includes("CreateSurface")),
          null,
          2,
        ).slice(0, 2000),
      );

    expect(ok).toBe(true);
  });

  test("updateDataModel 消息通过官方 schema 校验", async () => {
    const validate = await validator();
    const [message] = toA2UIMessages(result, {
      surfaceId: "slot-a",
      catalogId: "movie-web",
      data: [{ id: 1, title: "沙丘" }],
      existingTemplateId: "tpl",
    });

    const ok = validate(message);
    if (!ok)
      console.error(
        JSON.stringify(
          (validate.errors ?? []).filter((e) => e.schemaPath.includes("CreateSurface")),
          null,
          2,
        ).slice(0, 2000),
      );

    expect(ok).toBe(true);
  });
});
