import type { ContractDeclaration } from "@next-a2ui/contract";
import type { ActionContract } from "@next-a2ui/core";

/**
 * 组件契约声明。
 *
 * 只写 TS 类型表达不了的部分：语义（系统准确率的上限）、密度、数量约束。
 * accepts 与 emits 由抽取器从组件类型推导，组件源码零改动。
 */
export const movieContracts: readonly ContractDeclaration[] = [
  {
    component: "MovieGrid",
    data: "movies",
    semantics: {
      use: "封面优先的影片网格，适合浏览与发现",
      avoid: "缺少封面图时不要用；以对比为目的时改用对比表",
    },
    density: "rich",
    cardinality: { min: 1 },
  },
  {
    component: "MovieList",
    data: "movies",
    semantics: {
      use: "信息密集的影片行列表，适合筛选后的结果与长列表",
      avoid: "以视觉发现为目的时不要用",
    },
    density: "compact",
    cardinality: { min: 1 },
  },
  {
    component: "MovieComparison",
    data: "movies",
    semantics: {
      use: "并排对比两三部影片的关键指标",
      avoid: "只有一条时改用详情；超过五条时改用列表",
    },
    density: "normal",
    cardinality: { min: 2, max: 5 },
  },
  {
    component: "MovieDetail",
    data: "movie",
    semantics: { use: "单部影片的详情主体", avoid: "列表场景不要用" },
    density: "rich",
  },
  {
    component: "EmptyState",
    data: "movies",
    semantics: { use: "查询无结果时的空态，给出下一步建议", avoid: "有结果时不要用" },
    density: "compact",
    cardinality: { max: 0 },
  },
];

/**
 * 宿主 app 已有的状态操作，旁挂声明，页面代码零改动。
 *
 * 暂时手写：从 useState setter / dispatch 自动抽取动作契约是另一个问题，
 * 不在 MVP 范围内。
 */
export const movieActions: readonly ActionContract[] = [
  {
    id: "setFilter",
    params: { type: "object", required: ["genre"] },
    semantics: { use: "改变当前列表页的筛选条件", avoid: "不要用于跨页导航" },
    scope: "page",
    reversible: true,
  },
  {
    id: "setSort",
    params: { type: "object", required: ["sortBy"] },
    semantics: { use: "改变当前列表页的排序", avoid: "" },
    scope: "page",
    reversible: true,
  },
  {
    id: "openDetail",
    params: { type: "object", required: ["id"] },
    semantics: { use: "跳转到影片详情页", avoid: "" },
    scope: "app",
    reversible: true,
  },
  {
    id: "placeOrder",
    params: { type: "object", required: ["showtimeId", "seats"] },
    semantics: { use: "下单购票", avoid: "未确认座位前不要调用" },
    scope: "app",
    reversible: false,
  },
];
