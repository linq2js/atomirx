/**
 * Todos page.
 *
 * @description
 * Main page for managing todos.
 * Displays todo list, input, filters, and sync status.
 */

import { Suspense } from "react";
import { TodoInput } from "../../comps/todoInput";
import { FilterBar } from "../../comps/filterBar";
import { TodoList } from "../../comps/todoList";
import { TodoStats } from "../../comps/todoStats";
import { TodosHeader } from "../../comps/todosHeader";
import { DecryptionError } from "../../comps/decryptionError";
import { SkeletonTodoList } from "../../comps/skeletonTodoItem";
import { useTodosPageLogic } from "./todosPage.logic";

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
  const { isDecryptionError, onLogout, onSync, onAddTodo } =
    useTodosPageLogic();

  return (
    <div className="min-h-screen bg-gray-50">
      <TodosHeader onLogout={onLogout} onSync={onSync} />

      <main className="max-w-2xl mx-auto px-4 py-6">
        {isDecryptionError && <DecryptionError onLogout={onLogout} />}

        <div className="mb-6">
          <TodoInput
            onSubmit={onAddTodo}
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
