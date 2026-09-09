"use client";

import type { GenerativeUIEvent } from "@next-a2ui/adapter";
import type { ActionInvocation, CompileEvent, ComponentContract } from "@next-a2ui/core";
import { createRegistry, GenerativeSlot } from "@next-a2ui/runtime";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState.tsx";
import { MovieComparison } from "../components/MovieComparison.tsx";
import { MovieDetail } from "../components/MovieDetail.tsx";
import { MovieGrid } from "../components/MovieGrid.tsx";
import { MovieList } from "../components/MovieList.tsx";
import { GENRE_LABEL, GENRES, getMovies, type MovieQuery } from "../data/movies.ts";

interface AskResponse {
  readonly text: string;
  readonly events: readonly GenerativeUIEvent[];
  readonly agentMs: number;
  readonly totalMs: number;
  readonly log: readonly CompileEvent[];
}

const HOST_COMPONENTS = { MovieGrid, MovieList, MovieComparison, MovieDetail, EmptyState };

const EXAMPLES = [
  "帮我找 2026 年之后的科幻片",
  "有什么高分纪录片",
  "换成恐怖片看看",
  "评分 9 分以上的动作片",
];

export function MovieBrowser({ contracts }: { contracts: readonly ComponentContract[] }) {
  const registry = useMemo(() => createRegistry(contracts, HOST_COMPONENTS as never), [contracts]);

  // —— 这一整块是手写的经典页面，一行都没有被生成 ——
  const [filter, setFilter] = useState<MovieQuery>({});
  const movies = useMemo(() => getMovies(filter), [filter]);

  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [classic, setClassic] = useState(false);
  const [pending, setPending] = useState<ActionInvocation | null>(null);

  async function ask(text: string) {
    if (text.trim() === "" || busy) return;
    setBusy(true);
    setQuery(text);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: text }),
      });
      setResponse((await res.json()) as AskResponse);
    } finally {
      setBusy(false);
    }
  }

  /** 阶梯 1：agent 的动作直接驱动这个手写页面的状态，一个像素都没重画。 */
  function applyAction(action: ActionInvocation) {
    if (action.actionId === "setFilter") {
      setFilter((current) => ({ ...current, ...(action.params as MovieQuery) }));
    }
    if (action.actionId === "setSort") {
      const sortBy = action.params.sortBy;
      if (sortBy === "rating" || sortBy === "year") {
        setFilter((current) => ({ ...current, sortBy }));
      }
    }
  }

  const event = response?.events[0] ?? null;
  const metric = response?.log[0];

  return (
    <main>
      <nav className="nav">
        <b>影视</b>
        <Link href="/generated">整页生成演示 →</Link>
      </nav>
      <h1>影视 · 渐进式生成式 UI</h1>
      <p className="sub">
        下面的经典页面完全手写。agent 不知道 UI 的存在，编译引擎在它的 tool 调用后面观察。
      </p>

      <section className="panel">
        <div className="ask">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(query)}
            placeholder="问点什么，比如：帮我找 2026 年之后的科幻片"
          />
          <button type="button" className="primary" disabled={busy} onClick={() => ask(query)}>
            {busy ? "思考中…" : "问"}
          </button>
        </div>
        <div className="chips" style={{ marginTop: 12, marginBottom: 0 }}>
          {EXAMPLES.map((example) => (
            <button key={example} type="button" className="chip" onClick={() => ask(example)}>
              {example}
            </button>
          ))}
        </div>
        {response !== null && <p className="reply">{response.text}</p>}
        {response !== null && (
          <div className="metrics">
            <span className={`metric ${metric?.source === "L0" ? "hit" : "miss"}`}>
              编译 <b>{metric?.source ?? "—"}</b>
            </span>
            <span className="metric">
              编译耗时 <b>{metric?.durationMs.toFixed(0) ?? "—"}ms</b>
            </span>
            <span className="metric">
              组件候选 <b>{metric?.componentCandidates ?? "—"}</b>
            </span>
            <span className="metric">
              意图 <b>{metric?.intentClass ?? "—"}</b>
            </span>
            <span className="metric">
              agent <b>{response.agentMs}ms</b>
            </span>
          </div>
        )}
      </section>

      <section className="panel">
        <p className="panel-title">
          <span className="tag hand">手写</span> 经典列表页 —— agent 的动作直接驱动它
        </p>
        <div className="chips">
          <button
            type="button"
            className={`chip${filter.genre === undefined ? " on" : ""}`}
            onClick={() => setFilter({})}
          >
            全部
          </button>
          {GENRES.map((genre) => (
            <button
              key={genre}
              type="button"
              className={`chip${filter.genre === genre ? " on" : ""}`}
              onClick={() => setFilter((f) => ({ ...f, genre }))}
            >
              {GENRE_LABEL[genre]}
            </button>
          ))}
          {filter.yearGte !== undefined && <span className="chip on">{filter.yearGte} 年后</span>}
          {filter.ratingGte !== undefined && (
            <span className="chip on">{filter.ratingGte} 分以上</span>
          )}
        </div>
        <MovieGrid movies={movies} />
        {movies.length === 0 && <p className="empty-state">当前筛选没有匹配的影片</p>}
      </section>

      <section className="panel">
        <div className="row panel-title">
          <span>
            <span className="tag gen">生成</span> GenerativeSlot —— 引擎为这次提问编译出的界面
          </span>
          <button type="button" onClick={() => setClassic((v) => !v)}>
            {classic ? "用生成视图" : "切回经典视图"}
          </button>
        </div>
        <GenerativeSlot
          event={event}
          registry={registry}
          classic={classic}
          onAction={applyAction}
          onConfirmAction={setPending}
          fallback={
            <p className="empty-state">
              {classic
                ? "已切回经典视图"
                : event === null
                  ? "还没有编译结果，先在上面问点什么"
                  : "这次没能编译出界面，已降级到经典视图"}
            </p>
          }
        />
        {pending !== null && (
          <div className="confirm">
            <b>需要确认</b>：{pending.actionId}（{JSON.stringify(pending.params)}）
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setPending(null)}>
                取消
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  applyAction(pending);
                  setPending(null);
                }}
              >
                确认执行
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
