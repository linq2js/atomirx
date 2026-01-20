/**
 * SkeletonTodoItem domain component.
 *
 * @description
 * Skeleton placeholder for todo items during loading.
 * This is a domain component because it mirrors the TodoItem layout.
 *
 * @businessRules
 * - Layout matches TodoItem structure (checkbox, text, badge)
 * - Used during initial load and lazy loading
 */

import { cn } from "@/shared/utils";
import { Skeleton } from "@/ui";

/**
 * SkeletonTodoItem domain component.
 *
 * @example
 * ```tsx
 * <SkeletonTodoItem />
 * ```
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
 * SkeletonTodoList domain component.
 *
 * @description
 * Multiple skeleton todo items for list loading state.
 *
 * @example
 * ```tsx
 * <SkeletonTodoList count={5} />
 * ```
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
