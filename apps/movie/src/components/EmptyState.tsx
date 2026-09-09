import { SearchX } from "lucide-react";
import type { Movie } from "../types.ts";

/** 空态。数量约束（maxItems: 0）由契约声明补上，TS 类型表达不了。 */
export interface EmptyStateProps {
  movies: ReadonlyArray<Pick<Movie, "id">>;
  onReset?: () => void;
}

export function EmptyState({ onReset }: EmptyStateProps) {
  return (
    <div className="text-muted-foreground flex flex-col items-center gap-3 py-10 text-sm">
      <SearchX className="size-8 opacity-40" />
      <p>没有找到符合条件的影片</p>
      <button
        type="button"
        onClick={() => onReset?.()}
        className="hover:bg-accent cursor-pointer rounded-md border px-3 py-1.5 text-xs"
      >
        清除筛选
      </button>
    </div>
  );
}
