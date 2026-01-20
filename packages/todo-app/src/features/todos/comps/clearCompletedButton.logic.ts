/**
 * Clear completed button logic hook.
 *
 * @description
 * Manages state and handlers for the clear completed button.
 * Handles the clearing operation with loading state.
 *
 * @businessRules
 * - Clears all completed todos in a single operation
 * - Shows loading state during operation
 * - Button should be disabled when no completed todos exist
 */

import { useState } from "react";
import { useStable } from "atomirx/react";
import { todosStore } from "../stores/todos.store";

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
 * @returns Button state and handlers
 *
 * @example
 * ```tsx
 * const logic = useClearCompletedButtonLogic();
 * return <ClearCompletedButtonUI {...logic} />;
 * ```
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
    // State
    isClearing,
    // Handlers
    ...callbacks,
  };
}
