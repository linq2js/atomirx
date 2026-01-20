/**
 * SkeletonText composed component.
 *
 * @description
 * Text placeholder for loading states.
 * Composes primitives: Skeleton.
 */

import { type HTMLAttributes } from "react";
import { cn } from "@/shared/utils";
import { Skeleton } from "../primitives/Skeleton";

/**
 * SkeletonText component props.
 */
export interface SkeletonTextProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of lines */
  lines?: number;
  /** Width of the last line (as percentage) */
  lastLineWidth?: string;
}

/**
 * SkeletonText composed component.
 *
 * @example
 * ```tsx
 * <SkeletonText lines={3} lastLineWidth="60%" />
 * ```
 */
export function SkeletonText({
  className,
  lines = 1,
  lastLineWidth = "100%",
  ...props
}: SkeletonTextProps) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          style={{
            width: i === lines - 1 ? lastLineWidth : "100%",
          }}
        />
      ))}
    </div>
  );
}
