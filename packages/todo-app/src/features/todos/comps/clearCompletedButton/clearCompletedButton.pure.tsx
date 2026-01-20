/**
 * ClearCompletedButton presentation component.
 *
 * @description
 * Pure presentation component for ClearCompletedButton.
 *
 * @businessRules
 * - Deletes all completed todos
 * - Shows loading spinner during operation
 * - Displays count of completed items to be cleared
 */

import { Loader2 } from "lucide-react";

/**
 * ClearCompletedButton pure component props.
 */
export interface ClearCompletedButtonPureProps {
  /** Number of completed items */
  completedCount: number;
  /** Whether clearing is in progress */
  isClearing: boolean;
  /** Handle clear button click */
  onClear: () => Promise<void>;
}

/**
 * ClearCompletedButton pure presentation component.
 *
 * @example
 * ```tsx
 * <ClearCompletedButtonPure
 *   completedCount={5}
 *   isClearing={false}
 *   onClear={async () => {}}
 * />
 * ```
 */
export function ClearCompletedButtonPure({
  completedCount,
  isClearing,
  onClear,
}: ClearCompletedButtonPureProps) {
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
