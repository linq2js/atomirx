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

import { Loader2 } from "lucide-react";
import { useClearCompletedButtonLogic } from "./clearCompletedButton.logic";

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
  const { isClearing, onClear } = useClearCompletedButtonLogic();

  return (
    <button
      onClick={onClear}
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
