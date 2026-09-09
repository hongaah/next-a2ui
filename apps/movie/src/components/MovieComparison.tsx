import type { Movie } from "../types.ts";

export interface MovieComparisonProps {
  movies: ReadonlyArray<Pick<Movie, "id" | "title" | "rating">>;
  onSelect?: (id: number) => void;
}

export function MovieComparison({ movies, onSelect }: MovieComparisonProps) {
  return (
    <table className="movie-comparison">
      <tbody>
        {movies.map((movie) => (
          <tr key={movie.id} onClick={() => onSelect?.(movie.id)}>
            <td>{movie.title}</td>
            <td>{movie.rating.toFixed(1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
