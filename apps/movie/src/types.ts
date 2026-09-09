export interface Movie {
  id: number;
  title: string;
  poster: string;
  rating: number;
  year: number;
  genre: string;
  runtimeMinutes: number;
  tags: string[];
}

export interface MovieFull extends Movie {
  synopsis: string;
  director: string;
  cast: string[];
  country: string;
  /** 已观看进度 0-1，用于「继续观看」。 */
  progress?: number;
}
