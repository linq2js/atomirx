/**
 * TodoStats presentation component.
 *
 * @description
 * Pure presentation component for TodoStats.
 *
 * @businessRules
 * - Hidden when there are no todos
 * - Shows active item count
 * - Shows clear completed button when there are completed items
 * - Shows pending sync count when items are waiting to sync
 */

import { StatusBadge } from "../statusBadge";
import { ClearCompletedButton } from "../clearCompletedButton";

/**
 * TodoStats pure component props.
 */
export interface TodoStatsPureProps {
  /** Number of active todos */
  activeCount: number;
  /** Number of completed todos */
  completedCount: number;
  /** Number of pending sync items */
  pendingCount: number;
  /** Whether there are any todos */
  hasTodos: boolean;
}

/**
 * TodoStats pure presentation component.
 *
 * @example
 * ```tsx
 * <TodoStatsPure
 *   activeCount={3}
 *   completedCount={2}
 *   pendingCount={1}
 *   hasTodos={true}
 * />
 * ```
 */
export function TodoStatsPure({
  activeCount,
  completedCount,
  pendingCount,
  hasTodos,
}: TodoStatsPureProps) {
  if (!hasTodos) return null;

  return (
    <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
      <div className="flex items-center gap-4">
        <span>
          {activeCount} {activeCount === 1 ? "item" : "items"} left
        </span>
        {completedCount > 0 && (
          <ClearCompletedButton completedCount={completedCount} />
        )}
      </div>

      {pendingCount > 0 && (
        <div className="flex items-center gap-2">
          <StatusBadge status="pending" />
          <span>{pendingCount} pending</span>
        </div>
      )}
    </div>
  );
}
