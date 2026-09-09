"use client";

import type { GenerativeUIEvent } from "@next-a2ui/adapter";
import type { ComponentContract } from "@next-a2ui/core";
import { createRegistry, GenerativeSlot } from "@next-a2ui/runtime";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "../../components/EmptyState.tsx";
import { MovieCarousel } from "../../components/MovieCarousel.tsx";
import { MovieComparison } from "../../components/MovieComparison.tsx";
import { MovieDetail } from "../../components/MovieDetail.tsx";
import { MovieGrid } from "../../components/MovieGrid.tsx";
import { MovieList } from "../../components/MovieList.tsx";
import { MovieSpotlight } from "../../components/MovieSpotlight.tsx";

interface Region {
  readonly id: string;
  readonly title: string;
  readonly event: GenerativeUIEvent;
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

export function GeneratedPage({ contracts }: { contracts: readonly ComponentContract[] }) {
  const registry = useMemo(() => createRegistry(contracts, HOST_COMPONENTS as never), [contracts]);
  const [regions, setRegions] = useState<readonly Region[] | null>(null);

  useEffect(() => {
    void fetch("/api/page", { method: "POST" })
      .then((res) => res.json())
      .then((data: { regions: Region[] }) => setRegions(data.regions));
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <nav className="mb-6 text-sm">
        <Link href="/">← 回到经典页面</Link>
      </nav>
      <h1 className="mb-1 text-xl font-semibold">整页生成</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        页面 = 手写的布局骨架 + N 个 slot。每个 slot 独立编译、独立缓存、独立降级——
        一处失败不影响其余部分，也不会让缓存粒度退回整页。
      </p>

      {regions === null && (
        <section className="bg-card mb-5 rounded-xl border p-5">正在编译各个区域…</section>
      )}

      {regions?.map((region) => (
        <section key={region.id} className="bg-card mb-5 rounded-xl border p-5">
          <p className="text-muted-foreground mb-3 flex items-center gap-2 text-sm">
            <span className="bg-primary/15 text-primary rounded px-2 py-0.5 text-xs">生成</span>{" "}
            {region.title}
            <span className="bg-secondary rounded px-2 py-0.5 text-xs">
              {region.event.value.source}
            </span>
          </p>
          <GenerativeSlot
            event={region.event}
            registry={registry}
            fallback={
              <p className="text-muted-foreground py-8 text-center text-sm">
                这一区编译失败，已降级
              </p>
            }
          />
        </section>
      ))}
    </main>
  );
}
