import type { GenerativeUIEvent } from "@next-a2ui/adapter";
import { getMovies } from "../../../data/movies.ts";
import { middleware } from "../../../server/engine.ts";

export const dynamic = "force-dynamic";

/**
 * 整页生成 = 布局 + N 个 slot，各自独立编译、独立缓存、独立降级。
 *
 * 刻意不做成"一个巨大的 slot"：那样缓存粒度回到整页，命中率崩溃、首屏变慢，
 * 而且一处失败整页白屏。
 */
const REGIONS = [
  { id: "hero", query: "看看最近有什么好片", args: { sortBy: "rating" as const, ratingGte: 8.3 } },
  { id: "sci-fi", query: "科幻片有哪些", args: { genre: "sci-fi" as const } },
  { id: "recent", query: "今年新上的", args: { yearGte: 2026 } },
];

export async function POST(): Promise<Response> {
  const regions = await Promise.all(
    REGIONS.map(async (region) => {
      const result = getMovies(region.args);
      const { event }: { event: GenerativeUIEvent } = await middleware.onToolResult({
        userQuery: region.query,
        toolCall: { name: "getMovies", args: region.args },
        result,
      });
      // 每个 slot 一个独立的 surface
      return { id: region.id, title: region.query, event };
    }),
  );

  return Response.json({ regions });
}
