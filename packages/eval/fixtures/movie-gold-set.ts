import { getMovie, getMovies } from "@next-a2ui/movie/src/data/movies.ts";
import type { GoldCase } from "../src/harness.ts";

/**
 * 影视场景的 gold set。
 *
 * 数据直接来自宿主 app 的真实查询接口，不用合成数据——合成数据会漏字段，
 * 让评测衡量一个不存在的世界。这一点在组件契约变严格时立刻显形过一次。
 *
 * 用例刻意按真实流量的形状构造：大量不同的用户问法收敛到少数几种意图签名。
 * 命中率高不是因为用例重复，而是因为「取值不同、结构相同」的查询本就该
 * 共用同一个编译产物——这正是整套设计要证明的东西。
 */
export const movieGoldSet: readonly GoldCase[] = [
  // —— 浏览：不同筛选条件，同一意图签名 ——
  {
    name: "浏览科幻片",
    toolCall: { name: "getMovies", args: { genre: "sci-fi" } },
    data: getMovies({ genre: "sci-fi" }),
    intentClass: "browse",
    expectComponents: ["MovieGrid", "MovieList"],
    expectActions: ["setFilter"],
  },
  {
    name: "浏览恐怖片",
    toolCall: { name: "getMovies", args: { genre: "horror" } },
    data: getMovies({ genre: "horror" }),
    intentClass: "browse",
    expectComponents: ["MovieGrid"],
  },
  {
    name: "浏览喜剧",
    toolCall: { name: "getMovies", args: { genre: "comedy" } },
    data: getMovies({ genre: "comedy" }),
    intentClass: "browse",
  },
  {
    name: "浏览动作片",
    toolCall: { name: "getMovies", args: { genre: "action" } },
    data: getMovies({ genre: "action" }),
    intentClass: "browse",
  },

  // —— 筛选：多一个参数，签名随之改变 ——
  {
    name: "筛选 2025 年后的科幻片",
    toolCall: { name: "getMovies", args: { genre: "sci-fi", yearGte: 2025 } },
    data: getMovies({ genre: "sci-fi", yearGte: 2025 }),
    intentClass: "filter",
    expectActions: ["setFilter"],
  },
  {
    name: "筛选 2024 年后的动作片",
    toolCall: { name: "getMovies", args: { genre: "action", yearGte: 2024 } },
    data: getMovies({ genre: "action", yearGte: 2024 }),
    intentClass: "filter",
    expectActions: ["setFilter"],
  },

  // —— 按标签筛：动作候选集应当包含 filterByTag ——
  {
    name: "找赛博朋克题材",
    toolCall: { name: "getMovies", args: { tag: "赛博朋克" } },
    data: getMovies({ tag: "赛博朋克" }),
    intentClass: "filter",
    expectActions: ["filterByTag"],
  },

  // —— 空态：与有内容的列表必须走不同的界面 ——
  {
    name: "筛不出结果",
    toolCall: { name: "getMovies", args: { genre: "sci-fi", yearGte: 2030 } },
    data: getMovies({ genre: "sci-fi", yearGte: 2030 }),
    intentClass: "filter",
    expectComponents: ["EmptyState"],
  },

  // —— 对比：小基数，走对比组件 ——
  {
    name: "对比三部高分片",
    toolCall: { name: "getMovies", args: { ratingGte: 8.6 } },
    data: getMovies({ ratingGte: 8.6 }),
    intentClass: "compare",
    expectComponents: ["MovieComparison"],
  },
  {
    name: "对比两部纪录片",
    toolCall: { name: "getMovies", args: { genre: "documentary", ratingGte: 8.5 } },
    data: getMovies({ genre: "documentary", ratingGte: 8.5 }),
    intentClass: "compare",
    expectComponents: ["MovieComparison"],
  },

  // —— 详情：单个对象，只能走详情类组件；动作候选应含 play ——
  {
    name: "看《沙丘 3》详情",
    toolCall: { name: "getMovie", args: { id: 1 } },
    data: getMovie(1),
    intentClass: "detail",
    expectComponents: ["MovieDetail", "MovieSpotlight"],
    expectActions: ["play", "openDetail", "addToWatchlist"],
  },
  {
    name: "看《回音室》详情",
    toolCall: { name: "getMovie", args: { id: 5 } },
    data: getMovie(5),
    intentClass: "detail",
    expectComponents: ["MovieDetail"],
    expectActions: ["play"],
  },

  // —— 变体：同一意图的不同呈现，各占一个缓存条目 ——
  {
    name: "浏览（封面流变体）",
    toolCall: { name: "getMovies", args: { genre: "sci-fi" } },
    data: getMovies({ genre: "sci-fi" }),
    intentClass: "browse",
    variantId: "cover-flow",
  },
  {
    name: "浏览（信息密集变体）",
    toolCall: { name: "getMovies", args: { genre: "sci-fi" } },
    data: getMovies({ genre: "sci-fi" }),
    intentClass: "browse",
    variantId: "dense-list",
  },

  // —— capability gap：catalog 里没有时间轴 ——
  {
    name: "按年份画时间轴",
    toolCall: { name: "getMovieTimeline", args: { groupBy: "year" } },
    data: 2026,
    intentClass: "explain",
  },
];
