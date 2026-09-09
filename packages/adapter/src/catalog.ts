import type { Catalog, ComponentContract } from "@next-a2ui/core";

export interface A2UICatalogDocument {
  readonly $schema: string;
  readonly protocolVersion: string;
  readonly catalogId: string;
  readonly title: string;
  readonly components: Record<string, unknown>;
  readonly functions: Record<string, unknown>;
  readonly $defs: Record<string, unknown>;
}

const SPEC = "https://a2ui.org/specification/v1_0";

/**
 * 契约里的散文语义在这里第一次离开我们的进程。
 *
 * 它同时服务两个读者：编译时的模型（排序候选集）和任何第三方 A2UI renderer
 * （理解这个组件是干什么的）。语义标注的质量因此是双重的资产。
 */
function describe(contract: ComponentContract): string {
  const avoid = contract.semantics.avoid.trim();
  return avoid === "" ? contract.semantics.use : `${contract.semantics.use}。不适合：${avoid}`;
}

/** JSON Schema 里 oneOf 至少要有一项；没有候选时用 false 表示"永不匹配"。 */
function oneOfRefs(refs: readonly string[]): unknown {
  return refs.length === 0 ? false : { oneOf: refs.map((ref) => ({ $ref: ref })) };
}

function componentSchema(contract: ComponentContract): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    // 规范要求每个组件带一个与自身同名的常量判别式
    component: { const: contract.id },
    // 规范要求可绑定属性声明为 DynamicValue（字面量 | {path} 绑定 | 函数调用），
    // 而不是原始数据 schema——原始 schema 会让 {path:"/data"} 这样的绑定被拒收。
    // accepts 是我们做候选集匹配的内部契约，它的形状信息放进 description 供
    // 模型与第三方 renderer 参考。
    [contract.dataProp]: {
      $ref: `${SPEC}/common_types.json#/$defs/DynamicValue`,
      description: `承载数据的属性。期望形状：${JSON.stringify(contract.accepts)}`,
    },
  };

  for (const event of contract.emits) {
    properties[event.name] = {
      $ref: `${SPEC}/common_types.json#/$defs/Action`,
      description: `用户触发 ${event.name} 时回传给 agent 的动作`,
    };
  }

  return {
    type: "object",
    description: describe(contract),
    properties,
    required: ["component", contract.dataProp],
  };
}

/**
 * 把内部契约翻译成 A2UI v1.0 的 catalog 文档。
 *
 * 这是"同一份 tool 结果可编译成多端 UI"这个承诺的落点：catalog 一旦是标准
 * 文档，任何 A2UI renderer（React / Flutter / Lit / Angular）都能消费它。
 */
export function toA2UICatalog(catalog: Catalog): A2UICatalogDocument {
  const components: Record<string, unknown> = {};
  for (const contract of catalog.components) {
    components[contract.id] = componentSchema(contract);
  }

  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    protocolVersion: "v1.0",
    catalogId: catalog.id,
    title: `${catalog.id} @ ${catalog.version}`,
    components,
    functions: {},
    // 规范限定 $defs 只能有这两个键
    $defs: {
      anyComponent: oneOfRefs(catalog.components.map((contract) => `#/components/${contract.id}`)),
      // catalog 里没有函数。空的 oneOf: [] 不是合法 JSON Schema，
      // "永不匹配"的正确写法是 false。
      anyFunction: oneOfRefs([]),
    },
  };
}
