import { Star } from "lucide-react";
import type { Movie } from "../types.ts";
import { Poster } from "./poster.tsx";

/**
 * 组件只声明自己真正需要的字段。
 *
 * 契约抽取器会把这个类型原样变成数据契约，所以 props 类型开得越宽，
 * 候选集匹配就越严苛——这条压力是好事，它逼组件把接口收窄。
 */
export interface MovieGridProps {
  movies: ReadonlyArray<Pick<Movie, "id" | "title" | "poster" | "rating" | "year">>;
  onSelect?: (id: number) => void;
  onPlay?: (id: number) => void;
}

export function MovieGrid({ movies, onSelect, onPlay }: MovieGridProps) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {movies.map((movie) => (
        <li key={movie.id}>
          <button
            type="button"
            onClick={() => (onPlay ?? onSelect)?.(movie.id)}
            className="group w-full cursor-pointer text-left"
          >
            <Poster
              id={movie.id}
              face={movie.poster}
              title={movie.title}
              className="aspect-[2/3] w-full transition-transform group-hover:scale-[1.03]"
            />
            <div className="mt-2 truncate text-sm font-medium">{movie.title}</div>
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Star className="size-3 fill-warn text-warn" />
              {movie.rating.toFixed(1)}
              <span className="opacity-50">·</span>
              {movie.year}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
