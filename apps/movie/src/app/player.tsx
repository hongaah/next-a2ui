"use client";

import { Pause, Play, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Poster } from "../components/poster.tsx";
import type { MovieFull } from "../types.ts";
import { Badge } from "../ui/badge.tsx";
import { Button } from "../ui/button.tsx";

/** 宿主自己的播放器，不在 catalog 里——agent 通过 play 动作驱动它。 */
export function Player({ movie, onClose }: { movie: MovieFull; onClose: () => void }) {
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(movie.progress ?? 0);

  useEffect(() => {
    setProgress(movie.progress ?? 0);
    setPlaying(true);
  }, [movie]);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setProgress((p) => Math.min(1, p + 0.004)), 300);
    return () => clearInterval(timer);
  }, [playing]);

  const minutes = Math.round(movie.runtimeMinutes * progress);

  return (
    <div className="bg-card relative overflow-hidden rounded-xl border">
      <div className="from-primary/20 flex gap-5 bg-gradient-to-br to-transparent p-5">
        <Poster
          id={movie.id}
          face={movie.poster}
          title={movie.title}
          className="aspect-video w-56 shrink-0"
        />
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="ok">正在播放</Badge>
              <span className="text-muted-foreground text-xs">{movie.director}</span>
            </div>
            <h2 className="mt-2 text-lg font-semibold">{movie.title}</h2>
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{movie.synopsis}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button size="icon" onClick={() => setPlaying((v) => !v)}>
              {playing ? <Pause /> : <Play />}
            </Button>
            <div className="bg-secondary h-1.5 flex-1 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-[width] duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <span className="text-muted-foreground w-24 text-right text-xs tabular-nums">
              {minutes} / {movie.runtimeMinutes} 分钟
            </span>
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onClose}
        className="absolute top-3 right-3"
        aria-label="关闭播放器"
      >
        <X />
      </Button>
    </div>
  );
}
