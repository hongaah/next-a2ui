import type { MovieFull } from "../types.ts";

/** 宿主 app 自己的数据。生成式引擎从不生成数据，只生成结构。 */
const CATALOG: MovieFull[] = [
  {
    id: 1,
    title: "沙丘 3",
    poster: "🏜️",
    rating: 8.4,
    year: 2026,
    genre: "sci-fi",
    synopsis: "保罗在厄拉科斯的最终抉择。",
    director: "维伦纽瓦",
    runtimeMinutes: 166,
  },
  {
    id: 2,
    title: "银翼追猎",
    poster: "🌃",
    rating: 7.9,
    year: 2025,
    genre: "sci-fi",
    synopsis: "复制人侦探追查自己的来历。",
    director: "陈默",
    runtimeMinutes: 141,
  },
  {
    id: 3,
    title: "深空回响",
    poster: "🛰️",
    rating: 8.8,
    year: 2024,
    genre: "sci-fi",
    synopsis: "一艘失联三十年的飞船突然回话。",
    director: "李岸",
    runtimeMinutes: 128,
  },
  {
    id: 4,
    title: "夜行诊所",
    poster: "🏥",
    rating: 7.2,
    year: 2025,
    genre: "horror",
    synopsis: "值夜班的医生发现病历自己在写。",
    director: "王雾",
    runtimeMinutes: 98,
  },
  {
    id: 5,
    title: "回音室",
    poster: "🕯️",
    rating: 8.1,
    year: 2026,
    genre: "horror",
    synopsis: "搬进老宅后，每句话都会被回答。",
    director: "周砚",
    runtimeMinutes: 112,
  },
  {
    id: 6,
    title: "早八人生",
    poster: "☕",
    rating: 7.6,
    year: 2024,
    genre: "comedy",
    synopsis: "被困在周一早八的循环里。",
    director: "赵扬",
    runtimeMinutes: 105,
  },
  {
    id: 7,
    title: "外卖江湖",
    poster: "🛵",
    rating: 8.0,
    year: 2026,
    genre: "comedy",
    synopsis: "骑手们的武林。",
    director: "孙野",
    runtimeMinutes: 119,
  },
  {
    id: 8,
    title: "潮汐之下",
    poster: "🌊",
    rating: 8.6,
    year: 2023,
    genre: "documentary",
    synopsis: "追踪一场持续十年的海岸退却。",
    director: "林潮",
    runtimeMinutes: 96,
  },
  {
    id: 9,
    title: "山那边",
    poster: "⛰️",
    rating: 8.3,
    year: 2025,
    genre: "documentary",
    synopsis: "一所只有三个学生的高山小学。",
    director: "何川",
    runtimeMinutes: 88,
  },
  {
    id: 10,
    title: "钢筋森林",
    poster: "🏗️",
    rating: 7.4,
    year: 2024,
    genre: "action",
    synopsis: "拆迁队与守楼人的对峙。",
    director: "马迅",
    runtimeMinutes: 124,
  },
  {
    id: 11,
    title: "追风者",
    poster: "🏍️",
    rating: 7.8,
    year: 2026,
    genre: "action",
    synopsis: "赛车手最后一次上赛道。",
    director: "郑迅",
    runtimeMinutes: 133,
  },
  {
    id: 12,
    title: "静默列车",
    poster: "🚋",
    rating: 8.5,
    year: 2025,
    genre: "sci-fi",
    synopsis: "一列永不停站的列车。",
    director: "顾行",
    runtimeMinutes: 147,
  },
];

/**
 * 查询参数显式带上 undefined：调用方（agent 的 tool、页面的筛选器）都可能
 * 传入未设置的字段，exactOptionalPropertyTypes 下这必须写明。
 */
export interface MovieQuery {
  readonly genre?: string | undefined;
  readonly yearGte?: number | undefined;
  readonly ratingGte?: number | undefined;
  readonly sortBy?: "rating" | "year" | undefined;
}

/** 宿主 app 已有的查询接口，agent 把它当 tool 调用。 */
export function getMovies(query: MovieQuery = {}): MovieFull[] {
  let rows = CATALOG.filter(
    (movie) =>
      (query.genre === undefined || movie.genre === query.genre) &&
      (query.yearGte === undefined || movie.year >= query.yearGte) &&
      (query.ratingGte === undefined || movie.rating >= query.ratingGte),
  );
  if (query.sortBy === "rating") rows = [...rows].sort((a, b) => b.rating - a.rating);
  if (query.sortBy === "year") rows = [...rows].sort((a, b) => b.year - a.year);
  return rows;
}

export function getMovie(id: number): MovieFull | undefined {
  return CATALOG.find((movie) => movie.id === id);
}

export const GENRES = ["sci-fi", "horror", "comedy", "documentary", "action"] as const;
export const GENRE_LABEL: Record<string, string> = {
  "sci-fi": "科幻",
  horror: "恐怖",
  comedy: "喜剧",
  documentary: "纪录",
  action: "动作",
};
