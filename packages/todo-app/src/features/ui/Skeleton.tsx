/**
 * Skeleton loading component.
 *
 * @description
 * Placeholder components for loading states.
 * Provides consistent loading UI across the app.
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
 * Base skeleton component.
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

/**
 * Skeleton text line component.
 */
export interface SkeletonTextProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of lines */
  lines?: number;
  /** Width of the last line (as percentage) */
  lastLineWidth?: string;
}

/**
 * Skeleton text placeholder.
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

/**
 * Skeleton todo item for loading state.
 */
export function SkeletonTodoItem({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg bg-gray-50",
        className
      )}
    >
      <Skeleton width={20} height={20} circle />
      <div className="flex-1">
        <Skeleton height={16} width="70%" />
      </div>
      <Skeleton height={20} width={60} />
    </div>
  );
}

/**
 * Skeleton todo list for loading state.
 */
export function SkeletonTodoList({
  count = 5,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonTodoItem key={i} />
      ))}
    </div>
  );
}
