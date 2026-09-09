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
    runtimeMinutes: 166,
    tags: ["史诗", "沙漠", "续集"],
    synopsis: "保罗在厄拉科斯的最终抉择，香料战争走向终局。",
    director: "维伦纽瓦",
    cast: ["查拉梅", "赞达亚"],
    country: "美国",
    progress: 0.42,
  },
  {
    id: 2,
    title: "银翼追猎",
    poster: "🌃",
    rating: 7.9,
    year: 2025,
    genre: "sci-fi",
    runtimeMinutes: 141,
    tags: ["赛博朋克", "悬疑"],
    synopsis: "复制人侦探追查自己的来历，线索指向缔造者。",
    director: "陈默",
    cast: ["段奕宏", "周迅"],
    country: "中国",
  },
  {
    id: 3,
    title: "深空回响",
    poster: "🛰️",
    rating: 8.8,
    year: 2024,
    genre: "sci-fi",
    runtimeMinutes: 128,
    tags: ["硬科幻", "太空"],
    synopsis: "一艘失联三十年的飞船突然回话，回的却不是人类的语言。",
    director: "李岸",
    cast: ["张译", "咏梅"],
    country: "中国",
    progress: 0.86,
  },
  {
    id: 12,
    title: "静默列车",
    poster: "🚋",
    rating: 8.5,
    year: 2025,
    genre: "sci-fi",
    runtimeMinutes: 147,
    tags: ["寓言", "末世"],
    synopsis: "一列永不停站的列车，车上的人开始忘记为什么上车。",
    director: "顾行",
    cast: ["王砚辉", "齐溪"],
    country: "中国",
  },
  {
    id: 13,
    title: "第二地球",
    poster: "🌍",
    rating: 7.3,
    year: 2023,
    genre: "sci-fi",
    runtimeMinutes: 119,
    tags: ["移民", "灾难"],
    synopsis: "殖民船抵达新家园，却发现那里早有居民。",
    director: "何塞",
    cast: ["伊莎贝拉"],
    country: "西班牙",
  },
  {
    id: 4,
    title: "夜行诊所",
    poster: "🏥",
    rating: 7.2,
    year: 2025,
    genre: "horror",
    runtimeMinutes: 98,
    tags: ["心理", "医院"],
    synopsis: "值夜班的医生发现病历自己在写，而且写的是明天。",
    director: "王雾",
    cast: ["李梦", "章宇"],
    country: "中国",
  },
  {
    id: 5,
    title: "回音室",
    poster: "🕯️",
    rating: 8.1,
    year: 2026,
    genre: "horror",
    runtimeMinutes: 112,
    tags: ["老宅", "民俗"],
    synopsis: "搬进老宅后，每句话都会被回答——包括没说出口的。",
    director: "周砚",
    cast: ["春夏", "白客"],
    country: "中国",
  },
  {
    id: 14,
    title: "长夜将尽",
    poster: "🌑",
    rating: 7.7,
    year: 2024,
    genre: "horror",
    runtimeMinutes: 104,
    tags: ["生存", "极地"],
    synopsis: "极夜里的科考站，六个人只剩五份口粮。",
    director: "林珂",
    cast: ["黄觉"],
    country: "中国",
  },
  {
    id: 6,
    title: "早八人生",
    poster: "☕",
    rating: 7.6,
    year: 2024,
    genre: "comedy",
    runtimeMinutes: 105,
    tags: ["循环", "职场"],
    synopsis: "被困在周一早八的循环里，第 137 次决定摆烂。",
    director: "赵扬",
    cast: ["常远", "马丽"],
    country: "中国",
    progress: 0.15,
  },
  {
    id: 7,
    title: "外卖江湖",
    poster: "🛵",
    rating: 8.0,
    year: 2026,
    genre: "comedy",
    runtimeMinutes: 119,
    tags: ["市井", "武侠"],
    synopsis: "骑手们的武林，超时三分钟就要闯关。",
    director: "孙野",
    cast: ["雷佳音", "任素汐"],
    country: "中国",
  },
  {
    id: 15,
    title: "婚礼跑单",
    poster: "💒",
    rating: 7.1,
    year: 2025,
    genre: "comedy",
    runtimeMinutes: 96,
    tags: ["婚礼", "闹剧"],
    synopsis: "婚礼当天，策划师、新郎和前男友同时跑了。",
    director: "陈笑",
    cast: ["宋佳"],
    country: "中国",
  },
  {
    id: 8,
    title: "潮汐之下",
    poster: "🌊",
    rating: 8.6,
    year: 2023,
    genre: "documentary",
    runtimeMinutes: 96,
    tags: ["环境", "海洋"],
    synopsis: "追踪一场持续十年的海岸退却，和守在那里的人。",
    director: "林潮",
    cast: [],
    country: "中国",
  },
  {
    id: 9,
    title: "山那边",
    poster: "⛰️",
    rating: 8.3,
    year: 2025,
    genre: "documentary",
    runtimeMinutes: 88,
    tags: ["教育", "乡村"],
    synopsis: "一所只有三个学生的高山小学，和一位不肯走的老师。",
    director: "何川",
    cast: [],
    country: "中国",
  },
  {
    id: 16,
    title: "手艺",
    poster: "🪵",
    rating: 8.9,
    year: 2026,
    genre: "documentary",
    runtimeMinutes: 112,
    tags: ["非遗", "匠人"],
    synopsis: "十二位匠人，十二种正在消失的手感。",
    director: "沈木",
    cast: [],
    country: "中国",
  },
  {
    id: 10,
    title: "钢筋森林",
    poster: "🏗️",
    rating: 7.4,
    year: 2024,
    genre: "action",
    runtimeMinutes: 124,
    tags: ["犯罪", "都市"],
    synopsis: "拆迁队与守楼人的对峙，从谈判桌打到脚手架。",
    director: "马迅",
    cast: ["吴京"],
    country: "中国",
  },
  {
    id: 11,
    title: "追风者",
    poster: "🏍️",
    rating: 7.8,
    year: 2026,
    genre: "action",
    runtimeMinutes: 133,
    tags: ["赛车", "热血"],
    synopsis: "赛车手最后一次上赛道，赌上的是整支车队。",
    director: "郑迅",
    cast: ["彭于晏"],
    country: "中国",
  },
  {
    id: 17,
    title: "暗河",
    poster: "🌫️",
    rating: 8.2,
    year: 2025,
    genre: "action",
    runtimeMinutes: 138,
    tags: ["卧底", "边境"],
    synopsis: "卧底在边境线上待了七年，忘了自己原本是谁。",
    director: "刁亦男",
    cast: ["廖凡", "桂纶镁"],
    country: "中国",
    progress: 0.63,
  },
];

export interface MovieQuery {
  readonly genre?: string | undefined;
  readonly yearGte?: number | undefined;
  readonly ratingGte?: number | undefined;
  readonly tag?: string | undefined;
  readonly sortBy?: "rating" | "year" | "runtime" | undefined;
}

export function getMovies(query: MovieQuery = {}): MovieFull[] {
  let rows = CATALOG.filter(
    (movie) =>
      (query.genre === undefined || movie.genre === query.genre) &&
      (query.yearGte === undefined || movie.year >= query.yearGte) &&
      (query.ratingGte === undefined || movie.rating >= query.ratingGte) &&
      (query.tag === undefined || movie.tags.includes(query.tag)),
  );
  if (query.sortBy === "rating") rows = [...rows].sort((a, b) => b.rating - a.rating);
  if (query.sortBy === "year") rows = [...rows].sort((a, b) => b.year - a.year);
  if (query.sortBy === "runtime")
    rows = [...rows].sort((a, b) => a.runtimeMinutes - b.runtimeMinutes);
  return rows;
}

/** 按片名、简介、导演、主演做一次朴素搜索。宿主 app 已有的能力。 */
export function searchMovies(query: string): MovieFull[] {
  const needle = query.trim().replace(/[《》"'']/g, "");
  if (needle === "") return [];
  return CATALOG.filter((movie) =>
    [movie.title, movie.synopsis, movie.director, ...movie.cast, ...movie.tags].some((field) =>
      field.includes(needle),
    ),
  );
}

export function getMovie(id: number): MovieFull | undefined {
  return CATALOG.find((movie) => movie.id === id);
}

export function getContinueWatching(): MovieFull[] {
  return CATALOG.filter((movie) => movie.progress !== undefined).sort(
    (a, b) => (b.progress ?? 0) - (a.progress ?? 0),
  );
}

export const GENRES = ["sci-fi", "horror", "comedy", "documentary", "action"] as const;
export const GENRE_LABEL: Record<string, string> = {
  "sci-fi": "科幻",
  horror: "恐怖",
  comedy: "喜剧",
  documentary: "纪录",
  action: "动作",
};
export const ALL_TAGS = [...new Set(CATALOG.flatMap((m) => m.tags))].sort();
