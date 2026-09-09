/** 只覆盖候选集匹配需要的 JSON Schema 子集。完整校验交给 ajv。 */
export interface JsonSchema {
  readonly type?: string;
  readonly required?: readonly string[];
  readonly properties?: Readonly<Record<string, JsonSchema>>;
  readonly items?: JsonSchema;
  readonly minItems?: number;
  readonly maxItems?: number;
}

export interface SemanticEvent {
  readonly name: string;
  readonly payload?: JsonSchema;
}

/**
 * 组件契约。旁挂声明，组件源码零改动。
 *
 * 不得出现任何平台概念（className / ReactNode / DOM 事件名）——一旦污染，
 * 多端扩展就永久回不来了。
 */
export interface ComponentContract {
  readonly id: string;
  /**
   * 承载数据的 prop 名。
   *
   * 有了它，数据绑定就是确定的（把整份数据接到这个 prop 上），不必交给模型
   * 去猜——能算出来的就别问模型。
   */
  readonly dataProp: string;
  /** 数据契约：能渲染什么形状的数据。驱动候选集计算。 */
  readonly accepts: JsonSchema;
  /** 语义事件，非 DOM 事件。 */
  readonly emits: readonly SemanticEvent[];
  /**
   * 是否是容器组件（能接子节点）。
   *
   * catalog 里没有容器时，编译 schema 就不该含 children——模型没有可填的地方，
   * 也就编不出指向不存在节点的子引用。模型的输出面越小越准。
   */
  readonly acceptsChildren?: boolean;
  /** 给模型看的，决定候选集内部的排序质量。系统准确率的上限就在这里。 */
  readonly semantics: { readonly use: string; readonly avoid: string };
  readonly density: "compact" | "normal" | "rich";
}
