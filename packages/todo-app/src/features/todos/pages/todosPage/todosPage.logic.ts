/**
 * Todos page logic hook.
 *
 * @description
 * Manages state and handlers for the todos page.
 * Handles loading, sync, and CRUD operations.
 *
 * @businessRules
 * - Loads todos and sync meta on mount
 * - Shows decryption error banner if key mismatch detected
 * - Logout clears all stores (auth, todos, sync)
 * - Sync triggers full reload of todos
 */

import { useEffect } from "react";
import { useSelector, useStable } from "atomirx/react";
import { authStore } from "@/features/auth/stores/auth.store";
import { syncStore } from "@/features/sync/stores/sync.store";
import { todosStore, type TodoError } from "../../stores/todos.store";

/**
 * Todos page logic hook return type.
 */
export interface UseTodosPageLogicReturn {
  /** Error from todos operations */
  todosError: TodoError | null;
  /** Whether the error is a decryption error */
  isDecryptionError: boolean;
  /** Handle logout */
  onLogout: () => void;
  /** Handle sync */
  onSync: () => Promise<void>;
  /** Handle adding a todo */
  onAddTodo: (content: string) => Promise<void>;
}

/**
 * Todos page logic hook.
 *
 * @returns Todos page state and handlers
 *
 * @example
 * ```tsx
 * const logic = useTodosPageLogic();
 * return <TodosPageUI {...logic} />;
 * ```
 */
export function useTodosPageLogic(): UseTodosPageLogicReturn {
  // 1. External stores
  const auth = authStore();
  const todos = todosStore();
  const sync = syncStore();

  // 2. Selectors
  const todosError = useSelector(todos.error$);

  // 3. Computed values
  const isDecryptionError =
    todosError?.message?.includes("Decryption failed") ||
    todosError?.message?.includes("invalid key") ||
    false;

  // 4. Callbacks (useStable)
  const callbacks = useStable({
    onLogout: () => {
      auth.logout();
      todos.reset();
      sync.reset();
    },
    onSync: async () => {
      await sync.sync();
      await todos.loadTodos();
    },
    onAddTodo: async (content: string) => {
      await todos.addTodo(content);
    },
  });

  // 5. Effects (ALWAYS last)
  useEffect(() => {
    todos.loadTodos().catch(console.error);
    void sync.loadSyncMeta();
  }, [todos, sync]);

  return {
    // State
    todosError,
    isDecryptionError,
    // Handlers
    ...callbacks,
  };
}
