/**
 * Skeleton presentation component.
 *
 * @description
 * Pure presentation component for Skeleton.
 * Use this in Storybook to test all visual states.
 */

import { type HTMLAttributes } from "react";
import { cn } from "@/shared/utils";

/**
 * Skeleton pure component props.
 */
export interface SkeletonPureProps extends HTMLAttributes<HTMLDivElement> {
  /** Width of the skeleton (CSS value) */
  width?: string | number;
  /** Height of the skeleton (CSS value) */
  height?: string | number;
  /** Whether to show as a circle */
  circle?: boolean;
}

/**
 * Skeleton pure presentation component.
 *
 * @example
 * ```tsx
 * <SkeletonPure width={200} height={20} />
 * <SkeletonPure width={40} height={40} circle />
 * ```
 */
export function SkeletonPure({
  className,
  width,
  height,
  circle,
  style,
  ...props
}: SkeletonPureProps) {
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
