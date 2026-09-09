import type { WireComponent } from "./surface-store.ts";

/** A2UI 的数据绑定：`{ path: "/data/movies" }`。 */
function isDataBinding(value: unknown): value is { path: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as { path?: unknown }).path === "string"
  );
}

/**
 * 按 JSON Pointer 读取。
 *
 * 读不到返回 undefined 而不是抛出：数据未到、路径过时都是流式渲染里的常态，
 * 一个属性解析失败不该让整个 slot 崩掉。
 */
function readAtPath(root: unknown, path: string): unknown {
  const segments = path.split("/").filter((segment) => segment !== "");
  let cursor: unknown = root;
  for (const segment of segments) {
    if (cursor === null || cursor === undefined) return undefined;
    if (Array.isArray(cursor)) {
      const index = Number(segment);
      cursor = Number.isInteger(index) ? cursor[index] : undefined;
      continue;
    }
    if (typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

/**
 * 把线格式节点解析成宿主组件的 props。
 *
 * `id` 与 `component` 是协议自身的字段，不该漏给宿主组件——它们会变成
 * 意料之外的 DOM 属性。
 */
/** Action 属性由渲染层转成回调，不走这里。 */
function isComponentAction(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const event = (value as { event?: unknown }).event;
  return typeof event === "object" && event !== null && "name" in event;
}

export function resolveProps(node: WireComponent, dataModel: unknown): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === "id" || key === "component" || key === "children") continue;
    if (isComponentAction(value)) continue;
    props[key] = isDataBinding(value) ? readAtPath(dataModel, value.path) : value;
  }
  return props;
}
