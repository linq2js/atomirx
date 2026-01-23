/**
 * SkeletonTodoItem presentation component.
 *
 * @description
 * Pure presentation component for SkeletonTodoItem.
 *
 * @businessRules
 * - Layout matches TodoItem structure (checkbox, text, badge)
 * - Used during initial load and lazy loading
 */

import { cn } from "@/shared/utils";
import { Skeleton } from "@/ui";

/**
 * SkeletonTodoItem pure component props.
 */
export interface SkeletonTodoItemPureProps {
  /** Additional class names */
  className?: string;
}

/**
 * SkeletonTodoItem pure presentation component.
 *
 * @example
 * ```tsx
 * <SkeletonTodoItemPure />
 * ```
 */
export function SkeletonTodoItemPure({ className }: SkeletonTodoItemPureProps) {
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
 * SkeletonTodoList pure component props.
 */
export interface SkeletonTodoListPureProps {
  /** Number of skeleton items to show */
  count?: number;
  /** Additional class names */
  className?: string;
}

/**
 * SkeletonTodoList pure presentation component.
 *
 * @example
 * ```tsx
 * <SkeletonTodoListPure count={5} />
 * ```
 */
export function SkeletonTodoListPure({
  count = 5,
  className,
}: SkeletonTodoListPureProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonTodoItemPure key={i} />
      ))}
    </div>
  );
}
