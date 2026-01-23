/**
 * TodoList presentation component.
 *
 * @description
 * Pure presentation component for TodoList.
 *
 * @businessRules
 * - Shows loading skeleton while todos are loading
 * - Empty state message varies based on current filter
 * - Each todo item supports toggle, edit, and delete actions
 */

import { CheckCircle2, Circle, ListTodo } from "lucide-react";
import { TodoItem } from "../todoItem";
import { SkeletonTodoList } from "../skeletonTodoItem";
import type { TodoFilterType } from "../../stores/todosStore";
import type { Todo } from "../../types/storageTypes";

/**
 * TodoList pure component props.
 */
export interface TodoListPureProps {
  /** Filtered todos based on current filter */
  filteredTodos: Todo[];
  /** Whether todos are loading */
  isLoading: boolean;
  /** Current filter type */
  filter: TodoFilterType;
  /** Handle toggling a todo's completion */
  onToggle: (id: string) => Promise<void>;
  /** Handle updating a todo's content */
  onUpdate: (id: string, content: string) => Promise<void>;
  /** Handle deleting a todo */
  onDelete: (id: string) => Promise<void>;
}

/**
 * TodoList pure presentation component.
 *
 * @example
 * ```tsx
 * <TodoListPure
 *   filteredTodos={[]}
 *   isLoading={false}
 *   filter="all"
 *   onToggle={async () => {}}
 *   onUpdate={async () => {}}
 *   onDelete={async () => {}}
 * />
 * ```
 */
export function TodoListPure({
  filteredTodos,
  isLoading,
  filter,
  onToggle,
  onUpdate,
  onDelete,
}: TodoListPureProps) {
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
          onToggle={onToggle}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
