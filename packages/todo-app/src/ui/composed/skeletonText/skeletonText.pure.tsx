/**
 * SkeletonText presentation component.
 *
 * @description
 * Pure presentation component for SkeletonText.
 * Use this in Storybook to test all visual states.
 */

import { type HTMLAttributes } from "react";
import { cn } from "@/shared/utils";
import { Skeleton } from "../../primitives/skeleton";

/**
 * SkeletonText pure component props.
 */
export interface SkeletonTextPureProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of lines */
  lines?: number;
  /** Width of the last line (as percentage) */
  lastLineWidth?: string;
}

/**
 * SkeletonText pure presentation component.
 *
 * @example
 * ```tsx
 * <SkeletonTextPure lines={3} lastLineWidth="60%" />
 * ```
 */
export function SkeletonTextPure({
  className,
  lines = 1,
  lastLineWidth = "100%",
  ...props
}: SkeletonTextPureProps) {
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
