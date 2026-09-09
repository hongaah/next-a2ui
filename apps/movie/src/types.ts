export interface Movie {
  id: number;
  title: string;
  poster: string;
  rating: number;
  year: number;
  genre: string;
}

export interface MovieFull extends Movie {
  synopsis: string;
  director: string;
  runtimeMinutes: number;
}
