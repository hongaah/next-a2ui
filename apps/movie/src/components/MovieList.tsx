import { Clock, Play, Star } from "lucide-react";
import type { Movie } from "../types.ts";
import { Poster } from "./poster.tsx";

export interface MovieListProps {
  movies: ReadonlyArray<
    Pick<Movie, "id" | "title" | "poster" | "rating" | "year" | "runtimeMinutes">
  >;
  onSelect?: (id: number) => void;
  onPlay?: (id: number) => void;
}

export function MovieList({ movies, onSelect, onPlay }: MovieListProps) {
  return (
    <ul className="flex flex-col gap-1">
      {movies.map((movie) => (
        <li key={movie.id}>
          <div className="hover:bg-accent/60 flex items-center gap-3 rounded-lg p-2 transition-colors">
            <button type="button" onClick={() => onSelect?.(movie.id)} className="cursor-pointer">
              <Poster id={movie.id} face={movie.poster} title={movie.title} className="size-12" />
            </button>
            <button
              type="button"
              onClick={() => onSelect?.(movie.id)}
              className="min-w-0 flex-1 cursor-pointer text-left"
            >
              <div className="truncate text-sm font-medium">{movie.title}</div>
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1">
                  <Star className="size-3 fill-warn text-warn" />
                  {movie.rating.toFixed(1)}
                </span>
                <span>{movie.year}</span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {movie.runtimeMinutes} 分钟
                </span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onPlay?.(movie.id)}
              className="hover:bg-primary hover:text-primary-foreground cursor-pointer rounded-md p-2 transition-colors"
              aria-label={`播放 ${movie.title}`}
            >
              <Play className="size-4" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
