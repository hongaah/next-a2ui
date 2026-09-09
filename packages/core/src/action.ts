import type { JsonSchema } from "./contract.ts";

/**
 * 动作契约。描述现有 app 已有的状态操作（setState / dispatch / router.push），
 * 旁挂声明，宿主代码零改动。
 *
 * 与组件契约共用同一条抽取管线：数据契约决定"生成什么"，动作契约决定"控制什么"。
 */
export interface ActionContract {
  readonly id: string;
  readonly params: JsonSchema;
  readonly semantics: { readonly use: string; readonly avoid: string };
  readonly scope: "page" | "app";
  /** 不可逆动作（下单、删除）不得自动执行，必须先渲染确认。 */
  readonly reversible: boolean;
}

/** 可缓存的动作计划：用哪个动作、参数从哪个 tool 实参取。 */
export interface ActionPlan {
  readonly actionId: string;
  /** 动作参数名 → tool 实参名 */
  readonly paramMapping: Readonly<Record<string, string>>;
}

export interface ActionInvocation {
  readonly actionId: string;
  readonly params: Readonly<Record<string, unknown>>;
  /** 为 true 时宿主必须先向用户确认再执行。 */
  readonly requiresConfirmation: boolean;
}
