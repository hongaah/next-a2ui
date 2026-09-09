import type { ComponentProps } from "react";
import { cn } from "../lib/utils.ts";

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("bg-accent animate-pulse rounded-md", className)} {...props} />;
}
