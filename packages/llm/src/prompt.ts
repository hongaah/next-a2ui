import type {
  ActionContract,
  ComponentContract,
  IntentClass,
  ShapeDescriptor,
} from "@next-a2ui/core";

const INTENT_LABEL: Record<IntentClass, string> = {
  browse: "浏览发现",
  detail: "查看单项详情",
  compare: "并排对比",
  filter: "筛选后查看结果",
  confirm: "确认一个操作",
  edit: "修改数据",
  explain: "解释说明",
};

function describeData(shape: ShapeDescriptor): string {
  switch (shape.kind) {
    case "array":
      return `一个数组，长度落在 ${shape.lengthBucket} 区间，每个元素保证含有字段：${shape.fields.join("、") || "（无）"}`;
    case "object":
      return `单个对象，保证含有字段：${shape.fields.join("、") || "（无）"}`;
    case "scalar":
      return `一个 ${shape.type} 标量`;
  }
}

/**
 * 候选集已经把"选哪个组件"缩小到几个了，prompt 的唯一职责是让模型在这几个
 * 里选对——所以它只带语义描述，不带任何结构规则（结构由 schema 强制）。
 */
export function surfacePrompt(input: {
  candidates: readonly ComponentContract[];
  shape: ShapeDescriptor;
  intentClass: IntentClass;
}): string {
  const options = input.candidates
    .map(
      (candidate) =>
        `- ${candidate.id}（密度：${candidate.density}）\n  适合：${candidate.semantics.use}\n  不适合：${candidate.semantics.avoid || "（无特别限制）"}`,
    )
    .join("\n");

  return [
    "你在为一个已有的应用挑选界面组件并搭出结构。",
    "",
    `用户意图：${INTENT_LABEL[input.intentClass]}`,
    `数据形状：${describeData(input.shape)}`,
    "",
    "可选组件（只能从中选择）：",
    options,
    "",
    "要求：",
    "- 选最贴合意图与数据的组件，能用一个就不要嵌套",
    "- 只输出组件列表，根节点由系统从 children 关系推导，不要自己指定",
  ].join("\n");
}

export function actionPrompt(input: {
  candidates: readonly ActionContract[];
  availableArgs: readonly string[];
  intentClass: IntentClass;
}): string {
  const options = input.candidates
    .map(
      (candidate) =>
        `- ${candidate.id}${candidate.reversible ? "" : "（不可逆，会要求用户确认）"}\n  适合：${candidate.semantics.use}\n  不适合：${candidate.semantics.avoid || "（无特别限制）"}`,
    )
    .join("\n");

  return [
    "你在决定要不要用已有应用的状态操作来响应这次请求。",
    "",
    `用户意图：${INTENT_LABEL[input.intentClass]}`,
    `本次可用的实参：${input.availableArgs.join("、") || "（无）"}`,
    "",
    "可选动作（只能从中选择）：",
    options,
    "",
    "要求：",
    "- 只在动作确实能推进用户意图时才用，宁可返回空列表",
    "- 参数取值不由你决定，你只需说明每个参数取自哪个实参",
  ].join("\n");
}
