import { Play, Star } from "lucide-react";
import type { MovieFull } from "../types.ts";
import { Poster } from "./poster.tsx";

export interface MovieSpotlightProps {
  movie: Pick<MovieFull, "id" | "title" | "poster" | "rating" | "year" | "synopsis" | "tags">;
  onPlay?: (id: number) => void;
}

/** 单片主打位。适合「就推一部」的场景。 */
export function MovieSpotlight({ movie, onPlay }: MovieSpotlightProps) {
  return (
    <div className="flex gap-5">
      <Poster
        id={movie.id}
        face={movie.poster}
        title={movie.title}
        className="aspect-[2/3] w-28 shrink-0"
      />
      <div className="flex min-w-0 flex-col justify-center gap-2">
        <div className="text-lg font-semibold">{movie.title}</div>
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1">
            <Star className="size-3 fill-warn text-warn" />
            {movie.rating.toFixed(1)}
          </span>
          <span>{movie.year}</span>
          {movie.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="bg-secondary rounded px-1.5 py-0.5">
              {tag}
            </span>
          ))}
        </div>
        <p className="text-muted-foreground line-clamp-2 text-sm">{movie.synopsis}</p>
        <button
          type="button"
          onClick={() => onPlay?.(movie.id)}
          className="bg-primary text-primary-foreground mt-1 inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium"
        >
          <Play className="size-4" />
          播放
        </button>
      </div>
    </div>
  );
}
