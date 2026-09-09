/** 组件树中的一个节点。绑定只出现路径，永远不含取值。 */
export interface A2UIComponent {
  readonly id: string;
  readonly component: string;
  readonly children?: readonly string[];
  readonly bindings?: Readonly<Record<string, { readonly path: string }>>;
}

/** 编译产物：无数据的结构模板。数据在渲染时经 dataModel 绑定。 */
export interface SurfaceTemplate {
  readonly rootId: string;
  readonly components: readonly A2UIComponent[];
}
