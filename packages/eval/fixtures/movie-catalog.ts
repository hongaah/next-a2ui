import type { ActionContract, Catalog, ComponentContract } from "@next-a2ui/core";

/**
 * 影视 demo 的组件契约。
 *
 * 刻意做成语义级而非 Column/Row/Text 级：catalog 海拔越高，模型要写的
 * token 越少、出错面越小、设计一致性越是天然的。
 */
const components: ComponentContract[] = [
  {
    id: "MovieGrid",
    accepts: { type: "array", items: { type: "object", required: ["title", "poster"] } },
    emits: [{ name: "select" }],
    semantics: {
      use: "封面优先的影片网格，适合浏览与发现",
      avoid: "缺少封面图时不要用；超过 100 条时改用虚拟列表",
    },
    density: "rich",
  },
  {
    id: "MovieList",
    accepts: { type: "array", items: { type: "object", required: ["title"] } },
    emits: [{ name: "select" }],
    semantics: {
      use: "信息密集的影片行列表，适合对比与筛选后的结果",
      avoid: "以视觉发现为目的时不要用",
    },
    density: "compact",
  },
  {
    id: "MovieComparison",
    accepts: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: { type: "object", required: ["title", "rating"] },
    },
    emits: [{ name: "select" }],
    semantics: { use: "并排对比两三部影片的关键指标", avoid: "只有一条时改用详情" },
    density: "normal",
  },
  {
    id: "MovieDetail",
    accepts: { type: "object", required: ["title", "synopsis"] },
    emits: [{ name: "play" }, { name: "addToWatchlist" }],
    semantics: { use: "单部影片的详情页主体", avoid: "列表场景不要用" },
    density: "rich",
  },
  {
    id: "EmptyState",
    accepts: { type: "array", maxItems: 0 },
    emits: [{ name: "reset" }],
    semantics: { use: "查询无结果时的空态，给出下一步建议", avoid: "有结果时不要用" },
    density: "compact",
  },
];

/** 宿主 app 已有的状态操作，旁挂声明，页面代码零改动。 */
const actions: ActionContract[] = [
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
    params: { type: "object", required: ["movieId"] },
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

export const movieCatalog: Catalog = {
  id: "movie-web",
  version: "1.0.0",
  components,
  actions,
};
