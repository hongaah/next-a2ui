/** A2UI 的交互声明：用户触发时向 agent 派发一个事件。 */
export interface ComponentAction {
  readonly event: {
    readonly name: string;
    readonly userMessage?: string;
    readonly context?: Readonly<Record<string, unknown>>;
  };
}

/** 组件树中的一个节点。绑定只出现路径，永远不含取值。 */
export interface A2UIComponent {
  readonly id: string;
  readonly component: string;
  readonly children?: readonly string[];
  readonly bindings?: Readonly<Record<string, { readonly path: string }>>;
  /** 语义事件到 A2UI Action 的声明，由契约的 emits 推导，不问模型。 */
  readonly actions?: Readonly<Record<string, ComponentAction>>;
}

/** 编译产物：无数据的结构模板。数据在渲染时经 dataModel 绑定。 */
export interface SurfaceTemplate {
  readonly rootId: string;
  readonly components: readonly A2UIComponent[];
}
