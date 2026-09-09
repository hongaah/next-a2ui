import type { Movie } from "../types.ts";

/** 空态。数量约束（maxItems: 0）由契约声明补上，TS 类型表达不了。 */
export interface EmptyStateProps {
  movies: ReadonlyArray<Pick<Movie, "id">>;
  onReset?: () => void;
}

export function EmptyState({ onReset }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p>没有找到符合条件的影片</p>
      <button type="button" onClick={() => onReset?.()}>
        清除筛选
      </button>
    </div>
  );
}
