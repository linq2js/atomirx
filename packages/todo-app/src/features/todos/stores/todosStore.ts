/**
 * @module todosStore
 *
 * @description Manages todo list state with encrypted storage.
 * Provides CRUD operations, filtering, and optimistic updates.
 *
 * @atoms
 * - todos$ - Array of all todos (loaded from storage)
 * - filter$ - Current filter (all/active/completed)
 * - isLoading$ - Whether todos are being loaded
 * - error$ - Last operation error
 *
 * @derived
 * - filteredTodos$ - Todos after applying filter
 * - activeTodoCount$ - Number of incomplete todos
 * - completedTodoCount$ - Number of completed todos
 * - hasTodos$ - Whether there are any todos
 *
 * @actions
 * - loadTodos() - Load todos from storage
 * - addTodo(content) - Create a new todo
 * - toggleTodo(id) - Toggle completion status
 * - updateTodo(id, content) - Update todo content
 * - deleteTodo(id) - Soft delete a todo
 * - setFilter(filter) - Change filter
 * - clearCompleted() - Delete all completed todos
 *
 * @reactive-flow
 * addTodo(content) → storage.create → todos$ updated → filteredTodos$ → UI
 * setFilter(f) → filter$ → filteredTodos$ → UI
 */

import { atom, derived, define, batch, readonly } from "atomirx";
import { storageService } from "../services/storageService";
import type { Todo, CreateTodoInput } from "../types/storageTypes";

/**
 * Todo filter type.
 */
export type TodoFilterType = "all" | "active" | "completed";

/**
 * Todo operation error.
 */
export interface TodoError {
  operation: string;
  message: string;
}

/**
 * Todos state module.
 *
 * @example
 * ```ts
 * const todos = todosStore();
 *
 * // Load todos on auth
 * await todos.loadTodos();
 *
 * // Add a new todo
 * await todos.addTodo("Buy groceries");
 *
 * // Filter by active
 * todos.setFilter("active");
 *
 * // In React component
 * const filteredTodos = useSelector(todos.filteredTodos$);
 * ```
 */
export const todosStore = define(() => {
  // ┌─────────────────────────────────────────────────────────────┐
  // │ Dependency Graph:                                          │
  // │                                                            │
  // │  loadTodos/addTodo/toggleTodo/etc                          │
  // │         │                                                  │
  // │         ▼                                                  │
  // │      todos$ ──────────────────────────┐                    │
  // │         │                             │                    │
  // │         │                             ▼                    │
  // │         │                    activeTodoCount$              │
  // │         │                    completedTodoCount$           │
  // │         │                    hasTodos$                     │
  // │         │                             │                    │
  // │         ├──────────┬──────────────────┘                    │
  // │         ▼          ▼                                       │
  // │      filter$ → filteredTodos$ → (subscribers)              │
  // └─────────────────────────────────────────────────────────────┘

  const storage = storageService();

  // ─────────────────────────────────────────────────────────────
  // Atoms
  // ─────────────────────────────────────────────────────────────

  /**
   * All todos loaded from storage.
   */
  const todos$ = atom<Todo[]>([], {
    meta: { key: "todos.list" },
  });

  /**
   * Current filter selection.
   */
  const filter$ = atom<TodoFilterType>("all", {
    meta: { key: "todos.filter" },
  });

  /**
   * Whether todos are being loaded.
   */
  const isLoading$ = atom<boolean>(false, {
    meta: { key: "todos.isLoading" },
  });

  /**
   * Last operation error.
   */
  const error$ = atom<TodoError | null>(null, {
    meta: { key: "todos.error" },
  });

  // ─────────────────────────────────────────────────────────────
  // Derived
  // ─────────────────────────────────────────────────────────────

  /**
   * Todos filtered by current filter setting.
   */
  const filteredTodos$ = derived(
    ({ read }) => {
      const todos = read(todos$);
      const filter = read(filter$);

      switch (filter) {
        case "active":
          return todos.filter((t) => !t.completed);
        case "completed":
          return todos.filter((t) => t.completed);
        default:
          return todos;
      }
    },
    { meta: { key: "todos.filteredTodos" } }
  );

  /**
   * Number of active (incomplete) todos.
   */
  const activeTodoCount$ = derived(
    ({ read }) => {
      const todos = read(todos$);
      return todos.filter((t) => !t.completed).length;
    },
    { meta: { key: "todos.activeTodoCount" } }
  );

  /**
   * Number of completed todos.
   */
  const completedTodoCount$ = derived(
    ({ read }) => {
      const todos = read(todos$);
      return todos.filter((t) => t.completed).length;
    },
    { meta: { key: "todos.completedTodoCount" } }
  );

  /**
   * Whether there are any todos.
   */
  const hasTodos$ = derived(
    ({ read }) => {
      const todos = read(todos$);
      return todos.length > 0;
    },
    { meta: { key: "todos.hasTodos" } }
  );

  // ─────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────

  /**
   * Load todos from storage.
   *
   * @description
   * Fetches all todos from encrypted storage and populates the todos$ atom.
   * Should be called after authentication is complete.
   * Sorts todos by createdAt descending (newest first).
   *
   * @returns Promise that resolves when loading is complete
   * @throws Sets error$ if loading fails (does not throw)
   *
   * @example
   * ```ts
   * const todos = todosStore();
   * await todos.loadTodos();
   * // todos.todos$ now contains all todos
   * ```
   */
  async function loadTodos(): Promise<void> {
    error$.set(null);
    isLoading$.set(true);

    try {
      console.log("[Todos] Loading todos from storage...");
      console.log("[Todos] Storage initialized:", storage.isInitialized());
      const todos = await storage.getTodos();
      console.log("[Todos] Loaded", todos.length, "todos");
      // Sort by createdAt descending (newest first)
      todos.sort((a, b) => b.createdAt - a.createdAt);
      todos$.set(todos);
    } catch (err) {
      console.error("[Todos] Error loading todos:", err);
      error$.set({
        operation: "loadTodos",
        message: err instanceof Error ? err.message : "Failed to load todos",
      });
    } finally {
      isLoading$.set(false);
    }
  }

  /**
   * Add a new todo.
   *
   * @description
   * Creates a new todo with encrypted content. Updates todos$ optimistically
   * by prepending the new todo to the list.
   *
   * @param content - Todo content (will be encrypted). Trimmed before saving.
   * @returns Created todo or null if content is empty or on error
   *
   * @example
   * ```ts
   * const todo = await todos.addTodo("Buy groceries");
   * if (todo) {
   *   console.log("Created:", todo.id);
   * }
   * ```
   */
  async function addTodo(content: string): Promise<Todo | null> {
    error$.set(null);

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      error$.set({
        operation: "addTodo",
        message: "Todo content cannot be empty",
      });
      return null;
    }

    try {
      const input: CreateTodoInput = { content: trimmedContent };
      const newTodo = await storage.createTodo(input);

      // Optimistic update: add to beginning of list
      todos$.set((prev) => [newTodo, ...prev]);

      return newTodo;
    } catch (err) {
      error$.set({
        operation: "addTodo",
        message: err instanceof Error ? err.message : "Failed to add todo",
      });
      return null;
    }
  }

  /**
   * Toggle todo completion status.
   *
   * @description
   * Optimistically updates the UI, then persists to storage.
   * Rolls back on error.
   *
   * @param id - Todo UUID to toggle
   * @returns Updated todo or null if not found or on error
   *
   * @example
   * ```ts
   * const updated = await todos.toggleTodo(todo.id);
   * // todo.completed is now inverted
   * ```
   */
  async function toggleTodo(id: string): Promise<Todo | null> {
    error$.set(null);

    // Find current todo
    const currentTodos = todos$.get();
    const todo = currentTodos.find((t) => t.id === id);
    if (!todo) {
      error$.set({
        operation: "toggleTodo",
        message: "Todo not found",
      });
      return null;
    }

    // Optimistic update
    const newCompleted = !todo.completed;
    todos$.set((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: newCompleted } : t))
    );

    try {
      const updated = await storage.updateTodo(id, {
        completed: newCompleted,
      });

      if (!updated) {
        // Rollback optimistic update
        todos$.set((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, completed: todo.completed } : t
          )
        );
        error$.set({
          operation: "toggleTodo",
          message: "Todo not found in storage",
        });
        return null;
      }

      // Update with server response (includes new updatedAt)
      todos$.set((prev) => prev.map((t) => (t.id === id ? updated : t)));

      return updated;
    } catch (err) {
      // Rollback optimistic update
      todos$.set((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: todo.completed } : t))
      );
      error$.set({
        operation: "toggleTodo",
        message: err instanceof Error ? err.message : "Failed to toggle todo",
      });
      return null;
    }
  }

  /**
   * Update todo content.
   *
   * @description
   * Optimistically updates the UI, then persists to storage.
   * Rolls back on error. Empty content is rejected.
   *
   * @param id - Todo UUID to update
   * @param content - New content (trimmed before saving)
   * @returns Updated todo or null if not found, empty content, or on error
   *
   * @example
   * ```ts
   * const updated = await todos.updateTodoContent(todo.id, "Updated text");
   * ```
   */
  async function updateTodoContent(
    id: string,
    content: string
  ): Promise<Todo | null> {
    error$.set(null);

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      error$.set({
        operation: "updateTodo",
        message: "Todo content cannot be empty",
      });
      return null;
    }

    // Find current todo for rollback
    const currentTodos = todos$.get();
    const todo = currentTodos.find((t) => t.id === id);
    if (!todo) {
      error$.set({
        operation: "updateTodo",
        message: "Todo not found",
      });
      return null;
    }

    // Optimistic update
    todos$.set((prev) =>
      prev.map((t) => (t.id === id ? { ...t, content: trimmedContent } : t))
    );

    try {
      const updated = await storage.updateTodo(id, {
        content: trimmedContent,
      });

      if (!updated) {
        // Rollback
        todos$.set((prev) =>
          prev.map((t) => (t.id === id ? { ...t, content: todo.content } : t))
        );
        error$.set({
          operation: "updateTodo",
          message: "Todo not found in storage",
        });
        return null;
      }

      // Update with server response
      todos$.set((prev) => prev.map((t) => (t.id === id ? updated : t)));

      return updated;
    } catch (err) {
      // Rollback
      todos$.set((prev) =>
        prev.map((t) => (t.id === id ? { ...t, content: todo.content } : t))
      );
      error$.set({
        operation: "updateTodo",
        message: err instanceof Error ? err.message : "Failed to update todo",
      });
      return null;
    }
  }

  /**
   * Delete a todo (soft delete).
   *
   * @description
   * Optimistically removes from UI, then soft-deletes in storage.
   * Rolls back on error. Soft-deleted todos are kept until synced.
   *
   * @param id - Todo UUID to delete
   * @returns true if deleted successfully, false if not found or on error
   *
   * @example
   * ```ts
   * const deleted = await todos.deleteTodo(todo.id);
   * if (deleted) {
   *   showToast("Todo deleted");
   * }
   * ```
   */
  async function deleteTodo(id: string): Promise<boolean> {
    error$.set(null);

    // Find current todo for rollback
    const currentTodos = todos$.get();
    const todoIndex = currentTodos.findIndex((t) => t.id === id);
    if (todoIndex === -1) {
      error$.set({
        operation: "deleteTodo",
        message: "Todo not found",
      });
      return false;
    }
    const todo = currentTodos[todoIndex];

    // Optimistic update: remove from list
    todos$.set((prev) => prev.filter((t) => t.id !== id));

    try {
      const success = await storage.deleteTodo(id);

      if (!success) {
        // Rollback: insert back at original position
        todos$.set((prev) => {
          const newList = [...prev];
          newList.splice(todoIndex, 0, todo);
          return newList;
        });
        error$.set({
          operation: "deleteTodo",
          message: "Todo not found in storage",
        });
        return false;
      }

      return true;
    } catch (err) {
      // Rollback
      todos$.set((prev) => {
        const newList = [...prev];
        newList.splice(todoIndex, 0, todo);
        return newList;
      });
      error$.set({
        operation: "deleteTodo",
        message: err instanceof Error ? err.message : "Failed to delete todo",
      });
      return false;
    }
  }

  /**
   * Set the filter for displayed todos.
   *
   * @param newFilter - Filter to apply ("all", "active", or "completed")
   *
   * @example
   * ```ts
   * todos.setFilter("active"); // Show only incomplete todos
   * ```
   */
  function setFilter(newFilter: TodoFilterType): void {
    filter$.set(newFilter);
  }

  /**
   * Clear all completed todos.
   *
   * @description
   * Soft-deletes all completed todos. Optimistically removes from UI.
   * On partial failure, reloads from storage to reconcile state.
   *
   * @returns Number of todos successfully cleared
   *
   * @example
   * ```ts
   * const count = await todos.clearCompleted();
   * showToast(`Cleared ${count} completed todos`);
   * ```
   */
  async function clearCompleted(): Promise<number> {
    error$.set(null);

    const currentTodos = todos$.get();
    const completedTodos = currentTodos.filter((t) => t.completed);

    if (completedTodos.length === 0) {
      return 0;
    }

    // Optimistic update: remove completed from list
    const activeTodos = currentTodos.filter((t) => !t.completed);
    todos$.set(activeTodos);

    try {
      // Delete all completed todos
      const results = await Promise.allSettled(
        completedTodos.map((t) => storage.deleteTodo(t.id))
      );

      // Check for failures
      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length > 0) {
        // Partial failure - reload from storage
        await loadTodos();
        error$.set({
          operation: "clearCompleted",
          message: `Failed to clear ${failures.length} of ${completedTodos.length} todos`,
        });
        return completedTodos.length - failures.length;
      }

      return completedTodos.length;
    } catch (err) {
      // Rollback
      todos$.set(currentTodos);
      error$.set({
        operation: "clearCompleted",
        message:
          err instanceof Error
            ? err.message
            : "Failed to clear completed todos",
      });
      return 0;
    }
  }

  /**
   * Clear the error state.
   *
   * @example
   * ```ts
   * todos.clearError();
   * ```
   */
  function clearError(): void {
    error$.set(null);
  }

  /**
   * Reset todos state (for logout).
   *
   * @description
   * Clears all state: todos, filter, error, and loading flag.
   * Does NOT clear storage - use storage.clearAllData() for that.
   *
   * @example
   * ```ts
   * // On logout
   * todos.reset();
   * ```
   */
  function reset(): void {
    batch(() => {
      todos$.set([]);
      filter$.set("all");
      error$.set(null);
      isLoading$.set(false);
    });
  }

  return {
    // Read-only state (prevents external mutations)
    ...readonly({
      todos$,
      filter$,
      isLoading$,
      error$,
    }),

    // Derived state (already read-only by nature)
    filteredTodos$,
    activeTodoCount$,
    completedTodoCount$,
    hasTodos$,

    // Actions
    loadTodos,
    addTodo,
    toggleTodo,
    updateTodoContent,
    deleteTodo,
    setFilter,
    clearCompleted,
    clearError,
    reset,
  };
});
