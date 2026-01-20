/**
 * Skeleton primitive component.
 *
 * @description
 * Base placeholder component for loading states.
 * This is a primitive component - for composed skeletons, see ui/composed.
 */

import { type HTMLAttributes } from "react";
import { cn } from "@/shared/utils";

/**
 * Skeleton component props.
 */
export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Width of the skeleton (CSS value) */
  width?: string | number;
  /** Height of the skeleton (CSS value) */
  height?: string | number;
  /** Whether to show as a circle */
  circle?: boolean;
}

/**
 * Skeleton primitive component.
 *
 * @example
 * ```tsx
 * <Skeleton width={200} height={20} />
 * <Skeleton width={40} height={40} circle />
 * ```
 */
export function Skeleton({
  className,
  width,
  height,
  circle,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-gray-200",
        circle ? "rounded-full" : "rounded",
        className
      )}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        ...style,
      }}
      {...props}
    />
  );
}
