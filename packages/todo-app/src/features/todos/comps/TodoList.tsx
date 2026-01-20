/**
 * Todo list component.
 *
 * @description
 * Displays the filtered list of todos.
 * Shows empty state when no todos match the filter.
 *
 * @businessRules
 * - Shows loading skeleton while todos are loading
 * - Empty state message varies based on current filter
 * - Each todo item supports toggle, edit, and delete actions
 *
 * @edgeCases
 * - Loading: Shows skeleton list
 * - Empty list: Shows appropriate empty state message
 * - Filter with no matches: Shows filter-specific message
 */

import { useCallback } from "react";
import { useSelector } from "atomirx/react";
import { CheckCircle2, Circle, ListTodo } from "lucide-react";
import { todosStore } from "../stores";
import { TodoItem } from "./TodoItem";
import { SkeletonTodoList } from "./SkeletonTodoItem";

/**
 * Todo list component.
 *
 * @example
 * ```tsx
 * <Suspense fallback={<SkeletonTodoList count={5} />}>
 *   <TodoList />
 * </Suspense>
 * ```
 */
export function TodoList() {
  const todos = todosStore();
  const { filteredTodos, isLoading, filter } = useSelector(({ read }) => ({
    filteredTodos: read(todos.filteredTodos$),
    isLoading: read(todos.isLoading$),
    filter: read(todos.filter$),
  }));

  const handleToggle = useCallback(
    async (id: string) => {
      await todos.toggleTodo(id);
    },
    [todos]
  );

  const handleUpdate = useCallback(
    async (id: string, content: string) => {
      await todos.updateTodoContent(id, content);
    },
    [todos]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await todos.deleteTodo(id);
    },
    [todos]
  );

  if (isLoading) {
    return <SkeletonTodoList count={5} />;
  }

  if (filteredTodos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          {filter === "completed" ? (
            <CheckCircle2 className="h-8 w-8 text-gray-400" />
          ) : filter === "active" ? (
            <Circle className="h-8 w-8 text-gray-400" />
          ) : (
            <ListTodo className="h-8 w-8 text-gray-400" />
          )}
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          {filter === "completed"
            ? "No completed todos"
            : filter === "active"
              ? "No active todos"
              : "No todos yet"}
        </h3>
        <p className="text-gray-500">
          {filter === "all"
            ? "Add your first todo above"
            : `No ${filter} todos to show`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1 bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
      {filteredTodos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={handleToggle}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
