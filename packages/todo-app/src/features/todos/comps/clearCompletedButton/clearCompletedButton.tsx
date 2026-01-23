/**
 * Clear completed button component.
 *
 * @description
 * Button to clear all completed todos.
 * Shows loading state during deletion.
 */

import { useState } from "react";
import { useStable } from "atomirx/react";
import { todosStore } from "../../stores/todosStore";
import { ClearCompletedButtonPure } from "./clearCompletedButton.pure";

/**
 * Clear completed button logic hook return type.
 */
export interface UseClearCompletedButtonLogicReturn {
  /** Whether clearing is in progress */
  isClearing: boolean;
  /** Handle clear button click */
  onClear: () => Promise<void>;
}

/**
 * Clear completed button logic hook.
 *
 * @description
 * Manages state and handlers for the clear completed button.
 *
 * @businessRules
 * - Clears all completed todos in a single operation
 * - Shows loading state during operation
 *
 * @returns Button state and handlers
 */
export function useClearCompletedButtonLogic(): UseClearCompletedButtonLogicReturn {
  // 1. External stores
  const todos = todosStore();

  // 2. Local state
  const [isClearing, setIsClearing] = useState(false);

  // 3. Callbacks (useStable)
  const callbacks = useStable({
    onClear: async () => {
      setIsClearing(true);
      try {
        await todos.clearCompleted();
      } finally {
        setIsClearing(false);
      }
    },
  });

  return {
    isClearing,
    ...callbacks,
  };
}

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
    <ClearCompletedButtonPure
      completedCount={completedCount}
      isClearing={isClearing}
      onClear={onClear}
    />
  );
}
