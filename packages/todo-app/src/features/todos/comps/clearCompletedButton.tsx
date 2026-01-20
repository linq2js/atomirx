/**
 * Clear completed button component.
 *
 * @description
 * Button to clear all completed todos.
 * Shows loading state during deletion.
 *
 * @businessRules
 * - Deletes all completed todos
 * - Shows loading spinner during operation
 * - Displays count of completed items to be cleared
 */

import { useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { todosStore } from "../stores";

/**
 * Clear completed button props.
 */
export interface ClearCompletedButtonProps {
  /** Number of completed items */
  completedCount: number;
}

/**
 * Clear completed button component.
 *
 * @example
 * ```tsx
 * {completedCount > 0 && (
 *   <ClearCompletedButton completedCount={completedCount} />
 * )}
 * ```
 */
export function ClearCompletedButton({
  completedCount,
}: ClearCompletedButtonProps) {
  const todos = todosStore();
  const [isClearing, setIsClearing] = useState(false);

  const handleClear = useCallback(async () => {
    setIsClearing(true);
    try {
      await todos.clearCompleted();
    } finally {
      setIsClearing(false);
    }
  }, [todos]);

  return (
    <button
      onClick={handleClear}
      disabled={isClearing}
      className="text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline disabled:opacity-50"
    >
      {isClearing ? (
        <span className="flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Clearing...
        </span>
      ) : (
        `Clear completed (${completedCount})`
      )}
    </button>
  );
}
