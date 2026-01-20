/**
 * Todo stats footer component.
 *
 * @description
 * Displays todo statistics: items left, clear completed, pending sync count.
 *
 * @businessRules
 * - Hidden when there are no todos
 * - Shows active item count
 * - Shows clear completed button when there are completed items
 * - Shows pending sync count when items are waiting to sync
 */

import { useSelector } from "atomirx/react";
import { todosStore } from "../stores";
import { syncStore } from "@/features/sync";
import { StatusBadge } from "./StatusBadge";
import { ClearCompletedButton } from "./ClearCompletedButton";

/**
 * Todo stats footer component.
 *
 * @example
 * ```tsx
 * <TodoStats />
 * ```
 */
export function TodoStats() {
  const todos = todosStore();
  const sync = syncStore();

  const { activeCount, completedCount, pendingCount, hasTodos } = useSelector(
    ({ read }) => ({
      activeCount: read(todos.activeTodoCount$),
      completedCount: read(todos.completedTodoCount$),
      pendingCount: read(sync.pendingCount$),
      hasTodos: read(todos.hasTodos$),
    })
  );

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
