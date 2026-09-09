import { Bookmark, Clock, Play, Star } from "lucide-react";
import type { MovieFull } from "../types.ts";
import { Poster } from "./poster.tsx";

export interface MovieDetailProps {
  movie: Pick<
    MovieFull,
    | "id"
    | "title"
    | "poster"
    | "rating"
    | "year"
    | "runtimeMinutes"
    | "synopsis"
    | "director"
    | "cast"
    | "tags"
  >;
  onPlay?: (id: number) => void;
  onAddToWatchlist?: (id: number) => void;
}

export function MovieDetail({ movie, onPlay, onAddToWatchlist }: MovieDetailProps) {
  return (
    <article className="flex flex-col gap-4 sm:flex-row">
      <Poster
        id={movie.id}
        face={movie.poster}
        title={movie.title}
        className="aspect-[2/3] w-32 shrink-0"
      />
      <div className="flex min-w-0 flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">{movie.title}</h2>
          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <Star className="size-3 fill-warn text-warn" />
              {movie.rating.toFixed(1)}
            </span>
            <span>{movie.year}</span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {movie.runtimeMinutes} 分钟
            </span>
            <span>导演 {movie.director}</span>
            {movie.cast.length > 0 && <span>主演 {movie.cast.join("、")}</span>}
          </div>
        </div>
        <p className="text-sm leading-relaxed">{movie.synopsis}</p>
        <div className="flex flex-wrap gap-1.5">
          {movie.tags.map((tag) => (
            <span key={tag} className="bg-secondary rounded px-2 py-0.5 text-xs">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onPlay?.(movie.id)}
            className="bg-primary text-primary-foreground inline-flex cursor-pointer items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium"
          >
            <Play className="size-4" />
            播放
          </button>
          <button
            type="button"
            onClick={() => onAddToWatchlist?.(movie.id)}
            className="hover:bg-accent inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-4 py-2 text-sm"
          >
            <Bookmark className="size-4" />
            加入片单
          </button>
        </div>
      </div>
    </article>
  );
}
