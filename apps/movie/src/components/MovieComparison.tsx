import { Play, Star } from "lucide-react";
import type { Movie } from "../types.ts";

export interface MovieComparisonProps {
  movies: ReadonlyArray<
    Pick<Movie, "id" | "title" | "rating" | "year" | "runtimeMinutes" | "genre">
  >;
  onPlay?: (id: number) => void;
}

/** 并排对比。小基数场景专用，超过五条会被数量约束挡在候选集之外。 */
export function MovieComparison({ movies, onPlay }: MovieComparisonProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-muted-foreground text-xs">
          <tr className="border-b">
            <th className="px-3 py-2 text-left font-normal">片名</th>
            <th className="px-3 py-2 text-left font-normal">评分</th>
            <th className="px-3 py-2 text-left font-normal">年份</th>
            <th className="px-3 py-2 text-left font-normal">时长</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {movies.map((movie) => (
            <tr key={movie.id} className="hover:bg-accent/40 border-b transition-colors">
              <td className="px-3 py-2.5 font-medium">{movie.title}</td>
              <td className="px-3 py-2.5">
                <span className="flex items-center gap-1">
                  <Star className="size-3 fill-warn text-warn" />
                  {movie.rating.toFixed(1)}
                </span>
              </td>
              <td className="text-muted-foreground px-3 py-2.5">{movie.year}</td>
              <td className="text-muted-foreground px-3 py-2.5">{movie.runtimeMinutes} 分钟</td>
              <td className="px-3 py-2.5 text-right">
                <button
                  type="button"
                  onClick={() => onPlay?.(movie.id)}
                  className="hover:bg-primary hover:text-primary-foreground cursor-pointer rounded p-1.5 transition-colors"
                  aria-label={`播放 ${movie.title}`}
                >
                  <Play className="size-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
