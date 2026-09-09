import type { Movie } from "../types.ts";

export interface MovieListProps {
  movies: ReadonlyArray<Pick<Movie, "id" | "title">>;
  onSelect?: (id: number) => void;
}

export function MovieList({ movies, onSelect }: MovieListProps) {
  return (
    <ol className="movie-list">
      {movies.map((movie) => (
        <li key={movie.id}>
          <button type="button" onClick={() => onSelect?.(movie.id)}>
            {movie.title}
          </button>
        </li>
      ))}
    </ol>
  );
}
