import type { MovieFull } from "../types.ts";

export interface MovieDetailProps {
  movie: Pick<MovieFull, "title" | "synopsis" | "poster" | "rating">;
  onPlay: () => void;
  onAddToWatchlist: () => void;
}

export const MovieDetail = ({ movie, onPlay, onAddToWatchlist }: MovieDetailProps) => (
  <article className="movie-detail">
    <div aria-hidden style={{ fontSize: 48 }}>
      {movie.poster}
    </div>
    <h1>{movie.title}</h1>
    <p>{movie.synopsis}</p>
    <button type="button" onClick={onPlay}>
      播放
    </button>
    <button type="button" onClick={onAddToWatchlist}>
      加入片单
    </button>
  </article>
);
