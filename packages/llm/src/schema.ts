import type { ActionContract, ComponentContract } from "@next-a2ui/core";
import { z } from "zod";

function nonEmptyEnum(values: readonly string[]): [string, ...string[]] {
  const [head, ...rest] = values;
  if (head === undefined) throw new Error("枚举值不能为空");
  return [head, ...rest];
}

/**
 * 为一次 L2 编译构造受约束的输出 schema。
 *
 * 组件名是候选集的枚举而不是自由字符串——配合 provider 原生 strict mode，
 * 模型在 token 层面就无法产出 catalog 之外的组件。验证器仍然保留，但它从
 * "主要防线"降级成"断言不变式"：真跳出来说明实现有 bug，不是模型不听话。
 */
export function buildSurfaceSchema(candidates: readonly ComponentContract[]) {
  const componentNames = nonEmptyEnum(candidates.map((candidate) => candidate.id));
  const hasContainer = candidates.some((candidate) => candidate.acceptsChildren === true);

  // 刻意不让模型给 rootId：它引用的是模型在同一个对象里现编的 id，这种自引用
  // 约束 JSON Schema 表达不了，只能事后校验。拿掉它、由客户端从组件树推导，
  // 这类错误就变成不可表达的了。
  return z.object({
    components: z
      .array(
        z.object({
          id: z.string().describe("本节点的唯一 id"),
          component: z.enum(componentNames).describe("只能从候选组件中选择"),
          // catalog 里没有容器组件时干脆不给这个字段：模型没处可填，
          // 也就编不出指向不存在节点的子引用。这类错误因此不可表达。
          ...(hasContainer
            ? { children: z.array(z.string()).optional().describe("子节点 id 列表") }
            : {}),
        }),
      )
      .min(1),
  });
}

/**
 * 动作计划的受约束 schema。
 *
 * 与组件同一招：actionId 是候选集枚举，参数映射的**值**是本次 tool 实参的
 * 枚举。模型因此既编不出不存在的动作，也编不出取不到值的参数映射。
 *
 * 本次没有可用实参时，映射只能为空——此时 z.enum 无值可枚举，用 z.never()
 * 表达"任何键都非法"，而不是放宽成自由字符串。
 */
export function buildActionPlanSchema(
  candidates: readonly ActionContract[],
  availableArgs: readonly string[],
) {
  const actionIds = nonEmptyEnum(candidates.map((candidate) => candidate.id));
  const argSource = availableArgs.length === 0 ? z.never() : z.enum(nonEmptyEnum(availableArgs));

  return z.object({
    plans: z.array(
      z.object({
        actionId: z.enum(actionIds).describe("只能从候选动作中选择"),
        paramMapping: z
          .record(z.string(), argSource)
          .describe("动作参数名 → 本次 tool 调用的实参名；参数取值不由你决定"),
      }),
    ),
  });
}
