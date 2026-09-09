import type { LLMClient } from "@next-a2ui/core";

/**
 * 确定性替身：组件永远取候选集第一个，动作参数按同名映射。
 *
 * eval 的结构指标（命中率、候选集规模、schema 合法率、悬空率）不该依赖真实
 * 模型——它们衡量的是编译器与类型系统，不是模型能力。用替身跑还能让 CI gate
 * 完全离线、零成本、零 flake。模型质量另由意图匹配率评估。
 */
export function firstCandidateLLM(): LLMClient {
  return {
    async composeSurface({ candidates }) {
      const first = candidates[0];
      if (first === undefined) throw new Error("候选集为空，不该走到编译");
      return {
        rootId: "root",
        components: [{ id: "root", component: first.id, bindings: { items: { path: "/" } } }],
      };
    },
    async planActions({ candidates }) {
      return candidates.map((action) => ({
        actionId: action.id,
        paramMapping: Object.fromEntries(
          (action.params.required ?? []).map((param) => [param, param]),
        ),
      }));
    },
  };
}
