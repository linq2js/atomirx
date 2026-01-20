/**
 * Todos page.
 *
 * @description
 * Main page for managing todos.
 * Displays todo list, input, filters, and sync status.
 */

import { useEffect, useCallback, Suspense } from "react";
import { useSelector } from "atomirx/react";
import { authStore } from "@/features/auth";
import { syncStore } from "@/features/sync";
import { todosStore } from "../stores";
import {
  TodoInput,
  FilterBar,
  TodoList,
  TodoStats,
  TodosHeader,
  DecryptionError,
  SkeletonTodoList,
} from "../comps";

/**
 * Todos page component.
 *
 * @example
 * ```tsx
 * function App() {
 *   const isAuthenticated = useSelector(auth.isAuthenticated$);
 *   return isAuthenticated ? <TodosPage /> : <AuthPage />;
 * }
 * ```
 */
export function TodosPage() {
  const auth = authStore();
  const todos = todosStore();
  const sync = syncStore();

  const todosError = useSelector(todos.error$);

  useEffect(() => {
    todos.loadTodos().catch(console.error);
    void sync.loadSyncMeta();
  }, [todos, sync]);

  const isDecryptionError =
    todosError?.message?.includes("Decryption failed") ||
    todosError?.message?.includes("invalid key");

  const handleLogout = useCallback(() => {
    auth.logout();
    todos.reset();
    sync.reset();
  }, [auth, todos, sync]);

  const handleSync = useCallback(async () => {
    await sync.sync();
    await todos.loadTodos();
  }, [sync, todos]);

  const handleAddTodo = useCallback(
    async (content: string) => {
      await todos.addTodo(content);
    },
    [todos]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <TodosHeader onLogout={handleLogout} onSync={handleSync} />

      <main className="max-w-2xl mx-auto px-4 py-6">
        {isDecryptionError && <DecryptionError onLogout={handleLogout} />}

        <div className="mb-6">
          <TodoInput
            onSubmit={handleAddTodo}
            placeholder="What needs to be done?"
            autoFocus
          />
        </div>

        <div className="mb-4">
          <FilterBar />
        </div>

        <Suspense fallback={<SkeletonTodoList count={5} />}>
          <TodoList />
        </Suspense>

        <TodoStats />
      </main>
    </div>
  );
}
