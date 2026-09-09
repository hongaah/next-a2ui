import type { Movie } from "../types.ts";

/**
 * 组件只声明自己真正需要的字段。
 *
 * 契约抽取器会把这个类型原样变成数据契约，所以 props 类型开得越宽，
 * 候选集匹配就越严苛——这条压力是好事，它逼组件把接口收窄。
 */
export interface MovieGridProps {
  movies: ReadonlyArray<Pick<Movie, "id" | "title" | "poster">>;
  onSelect?: (id: number) => void;
}

export function MovieGrid({ movies, onSelect }: MovieGridProps) {
  return (
    <ul className="movie-grid">
      {movies.map((movie) => (
        <li key={movie.id}>
          <button type="button" onClick={() => onSelect?.(movie.id)}>
            <span aria-hidden style={{ fontSize: 34 }}>
              {movie.poster}
            </span>
            <span>{movie.title}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
