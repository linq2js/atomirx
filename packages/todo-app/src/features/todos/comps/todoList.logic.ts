/**
 * Todo list logic hook.
 *
 * @description
 * Manages state and handlers for the todo list.
 * Handles toggle, update, and delete operations.
 *
 * @businessRules
 * - Shows filtered todos based on current filter (all/active/completed)
 * - Loading state shown during initial load
 * - Operations delegated to todosStore for optimistic updates
 */

import { useSelector, useStable } from "atomirx/react";
import { todosStore, type TodoFilterType } from "../stores/todos.store";
import type { Todo } from "../types/storage.types";

/**
 * Todo list logic hook return type.
 */
export interface UseTodoListLogicReturn {
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
 * Todo list logic hook.
 *
 * @returns Todo list state and handlers
 *
 * @example
 * ```tsx
 * const logic = useTodoListLogic();
 * return <TodoListUI {...logic} />;
 * ```
 */
export function useTodoListLogic(): UseTodoListLogicReturn {
  // 1. External stores
  const todos = todosStore();

  // 2. Selectors
  const { filteredTodos, isLoading, filter } = useSelector(({ read }) => ({
    filteredTodos: read(todos.filteredTodos$),
    isLoading: read(todos.isLoading$),
    filter: read(todos.filter$),
  }));

  // 3. Callbacks (useStable)
  const callbacks = useStable({
    onToggle: async (id: string) => {
      await todos.toggleTodo(id);
    },
    onUpdate: async (id: string, content: string) => {
      await todos.updateTodoContent(id, content);
    },
    onDelete: async (id: string) => {
      await todos.deleteTodo(id);
    },
  });

  return {
    // State
    filteredTodos,
    isLoading,
    filter,
    // Handlers
    ...callbacks,
  };
}
