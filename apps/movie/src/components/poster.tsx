import { cn } from "../lib/utils.ts";

const HUES = [265, 200, 20, 150, 320, 90];

/** 内部展示件，不进 catalog。用色相把封面区分开，避免一片灰。 */
export function Poster({
  id,
  face,
  title,
  className,
}: {
  id: number;
  face: string;
  title: string;
  className?: string;
}) {
  const hue = HUES[id % HUES.length] ?? 265;
  return (
    <div
      className={cn(
        "poster-face relative flex items-center justify-center overflow-hidden rounded-lg border",
        className,
      )}
      style={{ ["--tw-gradient-from" as string]: `oklch(0.36 0.09 ${hue})` }}
      role="img"
      aria-label={title}
    >
      <span className="select-none text-4xl drop-shadow-lg">{face}</span>
    </div>
  );
}
