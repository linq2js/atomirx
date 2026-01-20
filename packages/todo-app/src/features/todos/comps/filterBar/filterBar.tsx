/**
 * Filter bar component.
 *
 * @description
 * Displays filter buttons for todo list (All, Active, Completed).
 * Highlights the currently active filter.
 */

import { useSelector } from "atomirx/react";
import { todosStore, type TodoFilterType } from "../../stores/todos.store";
import { FilterBarPure, type FilterBarPureProps } from "./filterBar.pure";

/**
 * FilterBar logic hook return type.
 */
export type UseFilterBarLogicReturn = FilterBarPureProps;

/**
 * FilterBar logic hook.
 *
 * @description
 * Connects filter bar to todos store.
 *
 * @returns Filter bar state and handlers
 */
export function useFilterBarLogic(): UseFilterBarLogicReturn {
  const todos = todosStore();
  const filter = useSelector(todos.filter$);

  return {
    filter,
    onFilterChange: (newFilter: TodoFilterType) => todos.setFilter(newFilter),
  };
}

/**
 * Filter bar component.
 *
 * @example
 * ```tsx
 * <FilterBar />
 * ```
 */
export function FilterBar() {
  const pureProps = useFilterBarLogic();
  return <FilterBarPure {...pureProps} />;
}
