import type { GoldCase } from "../src/harness.ts";

const movie = (i: number) => ({
  id: i,
  title: `影片 ${i}`,
  poster: `/p/${i}.jpg`,
  rating: 7 + (i % 3),
  year: 2020 + (i % 6),
});

const movies = (n: number) => Array.from({ length: n }, (_, i) => movie(i));

const detail = {
  id: 1,
  title: "沙丘 3",
  synopsis: "保罗在厄拉科斯的最终抉择。",
  poster: "/p/1.jpg",
  rating: 8.4,
  year: 2026,
};

/**
 * 影视场景的 gold set。
 *
 * 刻意按真实流量的形状构造：大量不同的用户问法收敛到少数几种意图签名。
 * 命中率高不是因为用例重复，而是因为「取值不同、结构相同」的查询本就该
 * 共用同一个编译产物——这正是整套设计要证明的东西。
 */
export const movieGoldSet: readonly GoldCase[] = [
  // —— 浏览：不同筛选条件，同一意图签名 ——
  {
    name: "浏览科幻片",
    toolCall: { name: "getMovies", args: { genre: "sci-fi" } },
    data: movies(18),
    intentClass: "browse",
    expectComponents: ["MovieGrid", "MovieList"],
    expectActions: ["setFilter"],
  },
  {
    name: "浏览恐怖片",
    toolCall: { name: "getMovies", args: { genre: "horror" } },
    data: movies(12),
    intentClass: "browse",
    expectComponents: ["MovieGrid"],
  },
  {
    name: "浏览喜剧",
    toolCall: { name: "getMovies", args: { genre: "comedy" } },
    data: movies(9),
    intentClass: "browse",
    expectComponents: ["MovieGrid"],
  },
  {
    name: "浏览纪录片",
    toolCall: { name: "getMovies", args: { genre: "documentary" } },
    data: movies(20),
    intentClass: "browse",
  },

  // —— 筛选：多一个参数，签名随之改变（可能出现不同的呈现）——
  {
    name: "筛选 2024 年后的科幻片",
    toolCall: { name: "getMovies", args: { genre: "sci-fi", yearGte: 2024 } },
    data: movies(7),
    intentClass: "filter",
    expectActions: ["setFilter"],
  },
  {
    name: "筛选 2020 年后的动作片",
    toolCall: { name: "getMovies", args: { genre: "action", yearGte: 2020 } },
    data: movies(15),
    intentClass: "filter",
    expectActions: ["setFilter"],
  },

  // —— 空态：与有内容的列表必须走不同的界面 ——
  {
    name: "筛不出结果",
    toolCall: { name: "getMovies", args: { genre: "sci-fi", yearGte: 2030 } },
    data: [],
    intentClass: "filter",
    expectComponents: ["EmptyState"],
  },

  // —— 对比：小基数，走对比组件 ——
  {
    name: "对比三部片",
    toolCall: { name: "getMovies", args: { ids: [1, 2, 3] } },
    data: movies(3),
    intentClass: "compare",
    expectComponents: ["MovieComparison"],
  },
  {
    name: "对比两部片",
    toolCall: { name: "getMovies", args: { ids: [1, 2] } },
    data: movies(2),
    intentClass: "compare",
    expectComponents: ["MovieComparison"],
  },

  // —— 详情：单个对象，只能走详情组件 ——
  {
    name: "看《沙丘 3》详情",
    toolCall: { name: "getMovie", args: { id: 1 } },
    data: detail,
    intentClass: "detail",
    expectComponents: ["MovieDetail"],
  },
  {
    name: "看另一部片详情",
    toolCall: { name: "getMovie", args: { id: 2 } },
    data: { ...detail, id: 2, title: "沙丘 2" },
    intentClass: "detail",
    expectComponents: ["MovieDetail"],
  },

  // —— 变体：同一意图的不同呈现，各占一个缓存条目 ——
  {
    name: "浏览（封面流变体）",
    toolCall: { name: "getMovies", args: { genre: "sci-fi" } },
    data: movies(16),
    intentClass: "browse",
    variantId: "cover-flow",
  },
  {
    name: "浏览（信息密集变体）",
    toolCall: { name: "getMovies", args: { genre: "sci-fi" } },
    data: movies(16),
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
