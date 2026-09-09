import type { ActionContract } from "./action.ts";
import type { ComponentContract, JsonSchema } from "./contract.ts";
import type { ShapeDescriptor } from "./data-shape.ts";

function coversFields(required: readonly string[], available: readonly string[]): boolean {
  return required.every((field) => available.includes(field));
}

/**
 * 基数必须先匹配：详情组件不能拿去渲染列表，列表组件也不能渲染单个对象。
 * 这是「详情 vs 列表」在类型层面的体现。
 */
function isCompatible(accepts: JsonSchema, shape: ShapeDescriptor): boolean {
  switch (shape.kind) {
    case "array":
      return accepts.type === "array" && coversFields(accepts.items?.required ?? [], shape.fields);
    case "object":
      return accepts.type === "object" && coversFields(accepts.required ?? [], shape.fields);
    case "scalar":
      return accepts.type === shape.type;
  }
}

/**
 * 由类型静态算出能安全渲染这份数据的组件。
 *
 * 这一步把模型面对的问题从"在整个 catalog 里组合一个界面"降级成
 * "在这几个候选里排序"，搜索空间砍掉约 99%——快与准同时解决。
 * 副作用是悬空引用在结构上不可能发生：候选集来自真实类型。
 */
export function candidates(
  catalog: readonly ComponentContract[],
  shape: ShapeDescriptor,
): ComponentContract[] {
  return catalog.filter((component) => isCompatible(component.accepts, shape));
}

/**
 * 由 tool 实参静态算出可以驱动的动作。
 *
 * 与组件候选集同一招：动作的必需参数必须能从 agent 本次调用的实参里取到，
 * 否则该动作根本没法被正确填参，不该交给模型排序。
 */
export function actionCandidates(
  actions: readonly ActionContract[],
  availableArgs: readonly string[],
): ActionContract[] {
  return actions.filter((action) => coversFields(action.params.required ?? [], availableArgs));
}
