import type { ComponentContract } from "./contract.ts";
import type { ShapeDescriptor } from "./data-shape.ts";
import type { SurfaceTemplate } from "./surface.ts";

export type ValidationErrorKind =
  | "unknown-component"
  | "unknown-child"
  | "missing-root"
  | "dangling-binding";

export interface ValidationError {
  readonly kind: ValidationErrorKind;
  readonly componentId: string;
  readonly detail: string;
}

export interface ValidationContext {
  readonly components: readonly ComponentContract[];
  readonly shape: ShapeDescriptor;
}

function fieldsOf(shape: ShapeDescriptor): readonly string[] {
  return shape.kind === "scalar" ? [] : shape.fields;
}

/**
 * 绑定路径能否落在真实数据上。
 *
 * 按 A2UI 的两种作用域区分：`/` 开头是根作用域，不带斜杠的是模板容器内的
 * 子作用域（相对当前元素）。shape 只记录顶层字段，因此更深的层级无法证伪——
 * 这里只报能证明为悬空的，不误报。
 */
function bindingResolves(path: string, shape: ShapeDescriptor): boolean {
  const isRootScope = path.startsWith("/");
  const segments = path.split("/").filter((segment) => segment !== "");

  // "/" —— 整个数据模型
  if (isRootScope && segments.length === 0) return true;

  let head = segments[0];
  if (head === undefined) return false;

  // 根作用域下访问数组，首段必须是下标，字段判定落到下一段
  if (isRootScope && shape.kind === "array") {
    if (!/^\d+$/.test(head)) return false;
    const next = segments[1];
    if (next === undefined) return true;
    head = next;
  }

  return fieldsOf(shape).includes(head);
}

/**
 * 验证 L2 产物。只有零错误的模板才允许写入缓存并返回。
 *
 * 这是「schema 合法率 100%、绑定悬空率 0」这两条绝对指标的执行者：
 * 候选集让悬空在结构上不可能构造，验证器保证万一构造出来也进不了缓存。
 */
export function validateTemplate(
  template: SurfaceTemplate,
  context: ValidationContext,
): ValidationError[] {
  const known = new Set(context.components.map((component) => component.id));
  const nodeIds = new Set(template.components.map((node) => node.id));
  const errors: ValidationError[] = [];

  if (!nodeIds.has(template.rootId)) {
    errors.push({
      kind: "missing-root",
      componentId: template.rootId,
      detail: "rootId 不在 components 中",
    });
  }

  for (const node of template.components) {
    if (!known.has(node.component)) {
      errors.push({ kind: "unknown-component", componentId: node.id, detail: node.component });
    }
    for (const child of node.children ?? []) {
      if (!nodeIds.has(child)) {
        errors.push({ kind: "unknown-child", componentId: node.id, detail: child });
      }
    }
    for (const binding of Object.values(node.bindings ?? {})) {
      if (!bindingResolves(binding.path, context.shape)) {
        errors.push({ kind: "dangling-binding", componentId: node.id, detail: binding.path });
      }
    }
  }

  return errors;
}
