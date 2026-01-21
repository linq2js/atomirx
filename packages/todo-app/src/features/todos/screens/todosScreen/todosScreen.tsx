/**
 * Todos screen.
 *
 * @description
 * Main screen for managing todos.
 * Displays todo list, input, filters, and sync status.
 */

import { useEffect } from "react";
import { useSelector, useStable } from "atomirx/react";
import { authStore } from "@/features/auth/stores/authStore";
import { syncStore } from "@/features/sync/stores/syncStore";
import { todosStore, type TodoError } from "../../stores/todosStore";
import { TodosScreenPure } from "./todosScreen.pure";

/**
 * Todos screen logic hook return type.
 */
export interface UseTodosScreenLogicReturn {
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
 * Todos screen logic hook.
 *
 * @description
 * Manages state and handlers for the todos screen.
 * Handles loading, sync, and CRUD operations.
 *
 * @businessRules
 * - Loads todos and sync meta on mount
 * - Shows decryption error banner if key mismatch detected
 * - Logout clears all stores (auth, todos, sync)
 * - Sync triggers full reload of todos
 *
 * @returns Todos screen state and handlers
 *
 * @example
 * ```tsx
 * const logic = useTodosScreenLogic();
 * return <TodosScreenUI {...logic} />;
 * ```
 */
export function useTodosScreenLogic(): UseTodosScreenLogicReturn {
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

/**
 * Todos screen component.
 *
 * @example
 * ```tsx
 * function App() {
 *   const isAuthenticated = useSelector(auth.isAuthenticated$);
 *   return isAuthenticated ? <TodosScreen /> : <AuthScreen />;
 * }
 * ```
 */
export function TodosScreen() {
  const pureProps = useTodosScreenLogic();
  return <TodosScreenPure {...pureProps} />;
}
