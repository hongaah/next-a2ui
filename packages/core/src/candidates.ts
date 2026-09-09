import type { ActionContract } from "./action.ts";
import type { ComponentContract, JsonSchema } from "./contract.ts";
import type { ShapeDescriptor } from "./data-shape.ts";

function coversFields(required: readonly string[], available: readonly string[]): boolean {
  return required.every((field) => available.includes(field));
}

/**
 * 组件的数量约束必须**完整覆盖**数据所在的分桶。
 *
 * 取覆盖而非相交是有意的：桶内任一长度都必须能安全渲染。maxItems=5 的对比
 * 组件遇到 6-20 桶就该出局——哪怕这次恰好只有 6 条。空态组件（maxItems=0）
 * 因此也只会匹配空列表。
 *
 * 这条约束原本只活在 semantics 的散文里（"超过 5 条不要用"），只有模型看得到
 * 且不可靠；搬进类型系统后它是被执行的，且不花一个 token。
 */
function coversLength(accepts: JsonSchema, range: readonly [number, number]): boolean {
  const min = accepts.minItems ?? 0;
  const max = accepts.maxItems ?? Number.POSITIVE_INFINITY;
  return range[0] >= min && range[1] <= max;
}

/**
 * 基数必须先匹配：详情组件不能拿去渲染列表，列表组件也不能渲染单个对象。
 * 这是「详情 vs 列表」在类型层面的体现。
 */
function isCompatible(accepts: JsonSchema, shape: ShapeDescriptor): boolean {
  switch (shape.kind) {
    case "array":
      if (accepts.type !== "array" || !coversLength(accepts, shape.lengthRange)) return false;
      // 数组必定为空时，元素字段要求是空真：没有元素要渲染，就没有字段可缺。
      // 空态组件的类型上照样标着元素形状，不能因此把它挡在空结果之外。
      if (shape.lengthRange[1] === 0) return true;
      return coversFields(accepts.items?.required ?? [], shape.fields);
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
