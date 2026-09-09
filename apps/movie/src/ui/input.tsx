import type { ComponentProps } from "react";
import { cn } from "../lib/utils.ts";

export function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "border-input bg-input/30 placeholder:text-muted-foreground flex h-10 w-full min-w-0 rounded-md border px-3.5 py-2 text-sm outline-none transition-[color,box-shadow]",
        "focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
