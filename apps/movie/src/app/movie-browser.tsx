"use client";

import type { GenerativeUIEvent, TraceStep } from "@next-a2ui/adapter";
import type { ActionInvocation, CompileEvent, ComponentContract } from "@next-a2ui/core";
import { type ActionMessage, createRegistry, GenerativeSlot } from "@next-a2ui/runtime";
import { Bookmark, Cpu, Gauge, Send, Sparkles, Wand2, Zap } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { EmptyState } from "../components/EmptyState.tsx";
import { MovieCarousel } from "../components/MovieCarousel.tsx";
import { MovieComparison } from "../components/MovieComparison.tsx";
import { MovieDetail } from "../components/MovieDetail.tsx";
import { MovieGrid } from "../components/MovieGrid.tsx";
import { MovieList } from "../components/MovieList.tsx";
import { MovieSpotlight } from "../components/MovieSpotlight.tsx";
import {
  ALL_TAGS,
  GENRE_LABEL,
  GENRES,
  getContinueWatching,
  getMovie,
  getMovies,
  type MovieQuery,
} from "../data/movies.ts";
import type { MovieFull } from "../types.ts";
import { Badge } from "../ui/badge.tsx";
import { Button } from "../ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.tsx";
import { Input } from "../ui/input.tsx";
import { Separator } from "../ui/separator.tsx";
import { Player } from "./player.tsx";

interface Turn {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly text: string;
}

let turnSeq = 0;
function nextTurn(role: Turn["role"], text: string): Turn {
  turnSeq += 1;
  return { id: `${role}-${turnSeq}`, role, text };
}

interface AskResponse {
  readonly text: string;
  readonly events: readonly GenerativeUIEvent[];
  readonly trace: readonly TraceStep[];
  readonly totalMs: number;
  readonly log: readonly CompileEvent[];
}

const HOST_COMPONENTS = {
  MovieGrid,
  MovieList,
  MovieCarousel,
  MovieSpotlight,
  MovieComparison,
  MovieDetail,
  EmptyState,
};

const EXAMPLES = [
  "有什么高分科幻片",
  "放《回音室》",
  "帮我比一下今年的动作片",
  "找点非遗题材的纪录片",
];

export function MovieBrowser({ contracts }: { contracts: readonly ComponentContract[] }) {
  const registry = useMemo(() => createRegistry(contracts, HOST_COMPONENTS as never), [contracts]);

  // —— 以下全是手写的宿主状态，一行都没有被生成 ——
  const [filter, setFilter] = useState<MovieQuery>({});
  const [nowPlaying, setNowPlaying] = useState<MovieFull | null>(null);
  const [watchlist, setWatchlist] = useState<readonly number[]>([]);
  const movies = useMemo(() => getMovies(filter), [filter]);
  const continueWatching = useMemo(() => getContinueWatching(), []);

  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<readonly Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [event, setEvent] = useState<GenerativeUIEvent | null>(null);
  const [metric, setMetric] = useState<CompileEvent | undefined>();
  const [trace, setTrace] = useState<readonly TraceStep[]>([]);
  const [totalMs, setTotalMs] = useState(0);
  const [classic, setClassic] = useState(false);
  const started = useRef(false);

  /** 阶梯 1：agent 的动作直接驱动这些手写状态，界面一个像素都没被生成。 */
  const applyAction = useCallback((action: ActionInvocation) => {
    const params = action.params as Record<string, unknown>;
    switch (action.actionId) {
      case "play": {
        const movie = getMovie(Number(params.id));
        if (movie !== undefined) setNowPlaying(movie);
        break;
      }
      case "openDetail": {
        const movie = getMovie(Number(params.id));
        if (movie !== undefined) setNowPlaying(movie);
        break;
      }
      case "addToWatchlist":
        setWatchlist((list) => [...new Set([...list, Number(params.id)])]);
        break;
      case "setFilter":
        setFilter((current) => ({ ...current, ...(params as MovieQuery) }));
        break;
      case "filterByTag":
        setFilter({ tag: String(params.tag) });
        break;
      case "setSort": {
        const sortBy = params.sortBy;
        if (sortBy === "rating" || sortBy === "year" || sortBy === "runtime") {
          setFilter((current) => ({ ...current, sortBy }));
        }
        break;
      }
    }
  }, []);

  const consume = useCallback((data: AskResponse) => {
    setTurns((list) => [...list, nextTurn("assistant", data.text)]);
    setEvent(data.events[data.events.length - 1] ?? null);
    setMetric(data.log[0]);
    setTrace(data.trace);
    setTotalMs(data.totalMs);
  }, []);

  const ask = useCallback(
    async (text: string) => {
      if (text.trim() === "" || busy) return;
      setBusy(true);
      setDraft("");
      setTurns((list) => [...list, nextTurn("user", text)]);
      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: text, fresh: !started.current }),
        });
        started.current = true;
        consume((await res.json()) as AskResponse);
      } finally {
        setBusy(false);
      }
    },
    [busy, consume],
  );

  /**
   * A2UI 回路：用户在生成界面上点了卡片，规范消息回到 agent，
   * agent 据此决定下一步，编译器再给出新界面。卡片是对话的一部分。
   */
  const dispatch = useCallback(
    async (message: ActionMessage) => {
      if (busy) return;
      setBusy(true);
      try {
        const res = await fetch("/api/interact", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message }),
        });
        const data = (await res.json()) as AskResponse & { userTurn: string };
        setTurns((list) => [...list, nextTurn("user", data.userTurn)]);
        consume(data);
      } finally {
        setBusy(false);
      }
    },
    [busy, consume],
  );

  const activeFilters = [
    filter.genre !== undefined ? GENRE_LABEL[filter.genre] : null,
    filter.tag,
    filter.yearGte !== undefined ? `${filter.yearGte} 年后` : null,
    filter.ratingGte !== undefined ? `${filter.ratingGte} 分以上` : null,
  ].filter((v): v is string => typeof v === "string");

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold">影视中心</h1>
          <span className="text-muted-foreground text-xs">next-a2ui · 渐进式生成式 UI</span>
        </div>
        <div className="flex items-center gap-4">
          {watchlist.length > 0 && (
            <Badge variant="secondary">
              <Bookmark className="size-3" /> 片单 {watchlist.length}
            </Badge>
          )}
          <Link href="/generated" className="text-primary text-xs hover:underline">
            整页生成演示 →
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          {nowPlaying !== null && <Player movie={nowPlaying} onClose={() => setNowPlaying(null)} />}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="text-primary size-4" />
                AI 编排区
                <Badge variant="outline">生成</Badge>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setClassic((v) => !v)}>
                {classic ? "用生成视图" : "切回经典视图"}
              </Button>
            </CardHeader>
            <CardContent>
              <GenerativeSlot
                event={event}
                registry={registry}
                classic={classic}
                onAction={applyAction}
                onDispatch={dispatch}
                fallback={
                  <div className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-sm">
                    <Wand2 className="size-7 opacity-30" />
                    <p>
                      {classic
                        ? "已切回经典视图"
                        : event === null
                          ? "在右侧问点什么，引擎会为这次意图编译界面"
                          : "这次没能编译出界面，已降级"}
                    </p>
                  </div>
                }
              />
            </CardContent>
          </Card>

          {continueWatching.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  继续观看 <Badge variant="outline">手写</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MovieCarousel
                  movies={continueWatching}
                  onPlay={(id) =>
                    applyAction({ actionId: "play", params: { id }, requiresConfirmation: false })
                  }
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>
                片库 <Badge variant="outline">手写</Badge>
                <span className="text-muted-foreground ml-2 font-normal">
                  agent 的动作直接驱动它
                </span>
              </CardTitle>
              {activeFilters.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setFilter({})}>
                  清除筛选
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-1.5">
                <Button
                  variant={filter.genre === undefined ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setFilter({})}
                >
                  全部
                </Button>
                {GENRES.map((genre) => (
                  <Button
                    key={genre}
                    variant={filter.genre === genre ? "default" : "secondary"}
                    size="sm"
                    onClick={() => setFilter((f) => ({ ...f, genre }))}
                  >
                    {GENRE_LABEL[genre]}
                  </Button>
                ))}
                <Separator orientation="vertical" className="mx-1 h-8" />
                {ALL_TAGS.slice(0, 6).map((tag) => (
                  <Button
                    key={tag}
                    variant={filter.tag === tag ? "default" : "ghost"}
                    size="sm"
                    onClick={() =>
                      setFilter((f) => ({ ...f, tag: f.tag === tag ? undefined : tag }))
                    }
                  >
                    {tag}
                  </Button>
                ))}
              </div>
              {activeFilters.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {activeFilters.map((label) => (
                    <Badge key={label}>{label}</Badge>
                  ))}
                </div>
              )}
              {movies.length === 0 ? (
                <EmptyState movies={[]} onReset={() => setFilter({})} />
              ) : (
                <MovieGrid
                  movies={movies}
                  onPlay={(id) =>
                    applyAction({ actionId: "play", params: { id }, requiresConfirmation: false })
                  }
                />
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <Card className="flex min-h-0 flex-1 flex-col">
            <CardHeader>
              <CardTitle>对话</CardTitle>
              {turns.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTurns([]);
                    started.current = false;
                  }}
                >
                  新对话
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
                {turns.length === 0 && (
                  <div className="text-muted-foreground flex flex-col gap-2 text-xs">
                    <p>试试这些：</p>
                    {EXAMPLES.map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => ask(example)}
                        className="hover:bg-accent cursor-pointer rounded-md border px-3 py-2 text-left transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                )}
                {turns.map((turn) => (
                  <div
                    key={turn.id}
                    className={
                      turn.role === "user"
                        ? "bg-primary/15 ml-6 rounded-lg px-3 py-2 text-sm"
                        : "bg-secondary mr-6 rounded-lg px-3 py-2 text-sm"
                    }
                  >
                    {turn.text}
                  </div>
                ))}
                {busy && (
                  <div className="text-muted-foreground mr-6 animate-pulse rounded-lg px-3 py-2 text-sm">
                    思考中…
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && ask(draft)}
                  placeholder="想看点什么？"
                />
                <Button size="icon" disabled={busy} onClick={() => ask(draft)} aria-label="发送">
                  <Send />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="size-4" /> 引擎链路
              </CardTitle>
              {totalMs > 0 && (
                <span className="text-muted-foreground text-xs tabular-nums">共 {totalMs}ms</span>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Metric label="编译" value={metric?.source ?? "—"} tone={metric?.source} />
                <Metric label="意图" value={metric?.intentClass ?? "—"} />
              </div>
              {trace.length === 0 ? (
                <p className="text-muted-foreground text-xs">问一句，这里会摊开每一步。</p>
              ) : (
                <ol className="flex flex-col gap-1.5">
                  {trace.map((step, index) => (
                    <li
                      key={step.id}
                      className="bg-secondary/50 flex items-start gap-2 rounded-md px-2.5 py-2 text-xs"
                    >
                      <span className="text-muted-foreground mt-0.5 w-4 shrink-0 tabular-nums">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium">{step.label}</span>
                          <span className="text-muted-foreground shrink-0 tabular-nums">
                            {step.durationMs.toFixed(0)}ms
                          </span>
                        </span>
                        {step.detail !== undefined && (
                          <span className="text-muted-foreground block truncate">
                            {step.detail}
                          </span>
                        )}
                        <span className="mt-1 flex items-center gap-1">
                          {step.model === undefined ? (
                            <span className="text-ok flex items-center gap-1">
                              <Zap className="size-3" /> 未调用模型
                            </span>
                          ) : (
                            <span className="text-muted-foreground flex min-w-0 items-center gap-1">
                              <Cpu className="size-3 shrink-0" />
                              <span className="truncate">{step.model}</span>
                            </span>
                          )}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string | undefined;
}) {
  const color = tone === "L0" ? "text-ok" : tone === "L2" ? "text-warn" : "";
  return (
    <div className="bg-secondary/60 rounded-md px-2.5 py-2">
      <div className="text-muted-foreground text-[11px]">{label}</div>
      <div className={`mt-0.5 font-medium ${color}`}>{value}</div>
    </div>
  );
}
