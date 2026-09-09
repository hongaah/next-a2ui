import type { ComponentType, ReactElement, ReactNode } from "react";
import { createElement } from "react";
import { resolveProps } from "./resolve-props.ts";
import type { ResolvedSurface, WireComponent } from "./surface-store.ts";

export interface RegisteredComponent {
  readonly component: ComponentType<Record<string, unknown>>;
  /** 契约声明的语义事件，用来合成宿主组件的 on* 回调。 */
  readonly emits?: readonly string[];
}

export type ComponentRegistry = Readonly<Record<string, RegisteredComponent>>;

export interface SurfaceEvent {
  readonly name: string;
  readonly payload: unknown;
}

export interface SurfaceViewProps {
  readonly surface: ResolvedSurface;
  readonly registry: ComponentRegistry;
  readonly onEvent?: (event: SurfaceEvent) => void;
}

const ROOT_ID = "root";

/** `select` → `onSelect`。语义事件到宿主回调 prop 的约定。 */
function callbackName(event: string): string {
  return `on${event.charAt(0).toUpperCase()}${event.slice(1)}`;
}

function UnknownComponent({ name }: { name: string }): ReactElement {
  // 组件缺失只降级这一个节点，不让整个 slot 崩掉。名字要露出来，
  // 否则这类问题在生产上无从定位。
  return createElement(
    "div",
    { "data-a2ui-unknown": name, style: { display: "none" } },
    `未注册的组件：${name}`,
  );
}

function renderNode(
  id: string,
  surface: ResolvedSurface,
  registry: ComponentRegistry,
  onEvent: ((event: SurfaceEvent) => void) | undefined,
  seen: ReadonlySet<string>,
): ReactNode {
  // 组件树来自模型，成环虽被验证器挡过一道，运行时仍要自保。
  if (seen.has(id)) return null;
  const node: WireComponent | undefined = surface.components.get(id);
  if (node === undefined) return null;

  const registered = registry[node.component];
  if (registered === undefined) {
    return createElement(UnknownComponent, { key: id, name: node.component });
  }

  const props = resolveProps(node, surface.dataModel);
  for (const event of registered.emits ?? []) {
    props[callbackName(event)] = (payload: unknown) => onEvent?.({ name: event, payload });
  }

  const nextSeen = new Set(seen).add(id);
  const children = (node.children ?? []).map((childId) =>
    renderNode(childId, surface, registry, onEvent, nextSeen),
  );

  return createElement(
    registered.component,
    { ...props, key: id },
    ...(children.length === 0 ? [] : children),
  );
}

/**
 * A2UI v1.0 的薄渲染层（见 spec §13.3）。
 *
 * 只做三件事：catalog 查表、属性绑定解析、语义事件回传。客户端函数、checks
 * 校验、双向绑定、模板容器一概不做——编译器刻意不生成它们。
 */
export function A2UISurfaceView({
  surface,
  registry,
  onEvent,
}: SurfaceViewProps): ReactElement | null {
  return renderNode(ROOT_ID, surface, registry, onEvent, new Set()) as ReactElement | null;
}
