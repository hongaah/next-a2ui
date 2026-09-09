import { Play } from "lucide-react";
import type { Movie } from "../types.ts";
import { Poster } from "./poster.tsx";

export interface MovieCarouselProps {
  movies: ReadonlyArray<Pick<Movie, "id" | "title" | "poster">>;
  onPlay?: (id: number) => void;
}

/** 横向片单。适合「继续观看」「为你推荐」这类可滑动的行。 */
export function MovieCarousel({ movies, onPlay }: MovieCarouselProps) {
  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
      {movies.map((movie) => (
        <button
          key={movie.id}
          type="button"
          onClick={() => onPlay?.(movie.id)}
          className="group w-32 shrink-0 cursor-pointer text-left"
        >
          <div className="relative">
            <Poster
              id={movie.id}
              face={movie.poster}
              title={movie.title}
              className="aspect-video w-full"
            />
            <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
              <Play className="size-6 fill-white text-white drop-shadow" />
            </span>
          </div>
          <div className="mt-1.5 truncate text-xs">{movie.title}</div>
        </button>
      ))}
    </div>
  );
}
