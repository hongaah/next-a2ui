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
      use: "封面墙。以视觉发现为主的浏览场景，用户在扫封面而不是读信息",
      avoid: "需要比较具体指标时不要用；结果很少时改用主打位",
    },
    density: "rich",
    cardinality: { min: 2 },
  },
  {
    component: "MovieList",
    data: "movies",
    semantics: {
      use: "信息密集的行列表，每行带评分年份时长。筛选后看结果、需要逐条判断时用它",
      avoid: "以视觉发现为目的时不要用",
    },
    density: "compact",
    cardinality: { min: 1 },
  },
  {
    component: "MovieCarousel",
    data: "movies",
    semantics: {
      use: "横向可滑动的片单行。适合「继续观看」「为你推荐」这类顺带一瞥的编排",
      avoid: "用户明确在找东西时不要用，横向滚动不利于比较",
    },
    density: "normal",
    cardinality: { min: 2, max: 20 },
  },
  {
    component: "MovieSpotlight",
    data: "movie",
    semantics: {
      use: "单片主打位，带简介和播放按钮。只推一部、或结果恰好只有一部时用它",
      avoid: "有多个候选时不要用",
    },
    density: "rich",
  },
  {
    component: "MovieComparison",
    data: "movies",
    semantics: {
      use: "并排对比表，把评分年份时长摆在一起。用户在做取舍时用它",
      avoid: "只有一条时改用主打位；超过五条时改用列表",
    },
    density: "normal",
    cardinality: { min: 2, max: 5 },
  },
  {
    component: "MovieDetail",
    data: "movie",
    semantics: {
      use: "单部影片的完整详情：简介、导演、主演、标签、播放与加片单",
      avoid: "列表场景不要用",
    },
    density: "rich",
  },
  {
    component: "EmptyState",
    data: "movies",
    semantics: { use: "查询无结果时的空态，给出清除筛选的出口", avoid: "有结果时不要用" },
    density: "compact",
    cardinality: { max: 0 },
  },
];

/**
 * 宿主 app 已有的状态操作，旁挂声明，页面代码零改动。
 *
 * **参数名要与 tool 的实参名对齐**：候选集靠名字判定"这个动作能不能被正确
 * 填参"，`play` 需要 `id`，就必须有某个 tool 的实参里带 `id`。这条约束让
 * 动作选择同样是类型驱动的，而不是让模型去猜映射关系。
 *
 * 从 useState setter / dispatch 自动抽取动作契约是另一个问题，不在 MVP 范围。
 */
export const movieActions: readonly ActionContract[] = [
  {
    id: "play",
    params: { type: "object", required: ["id"] },
    semantics: {
      use: "在宿主播放器里开始播放。用户说「放」「看」「播」「来一部」时的默认动作",
      avoid: "用户明确只想了解剧情、评分、导演等信息而没有观看意向时不要用",
    },
    scope: "app",
    reversible: true,
  },
  {
    id: "openDetail",
    params: { type: "object", required: ["id"] },
    semantics: {
      use: "只把详情推到详情区而不开始播放。用户在问「讲什么」「谁演的」时用它",
      avoid: "只要用户有观看意向就改用 play，两者不要同时给",
    },
    scope: "app",
    reversible: true,
  },
  {
    id: "addToWatchlist",
    params: { type: "object", required: ["id"] },
    semantics: { use: "把影片加入稍后观看", avoid: "" },
    scope: "app",
    reversible: true,
  },
  {
    id: "setFilter",
    params: { type: "object", required: ["genre"] },
    semantics: {
      use: "改变宿主列表页的题材筛选，让手写页面跟着用户的话变",
      avoid: "不要用于跨页导航",
    },
    scope: "page",
    reversible: true,
  },
  {
    id: "filterByTag",
    params: { type: "object", required: ["tag"] },
    semantics: { use: "按标签筛选，比如「赛博朋克」「非遗」", avoid: "" },
    scope: "page",
    reversible: true,
  },
  {
    id: "setSort",
    params: { type: "object", required: ["sortBy"] },
    semantics: { use: "改变列表排序：评分、年份或时长", avoid: "" },
    scope: "page",
    reversible: true,
  },
];
