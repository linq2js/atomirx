/**
 * Todo stats footer component.
 *
 * @description
 * Displays todo statistics: items left, clear completed, pending sync count.
 */

import { useSelector } from "atomirx/react";
import { todosStore } from "../../stores/todosStore";
import { syncStore } from "@/features/sync/stores/syncStore";
import { TodoStatsPure, type TodoStatsPureProps } from "./todoStats.pure";

/**
 * TodoStats logic hook return type.
 */
export type UseTodoStatsLogicReturn = TodoStatsPureProps;

/**
 * TodoStats logic hook.
 *
 * @description
 * Connects stats to todos and sync stores.
 *
 * @returns Stats data
 */
export function useTodoStatsLogic(): UseTodoStatsLogicReturn {
  const todos = todosStore();
  const sync = syncStore();

  const { activeCount, completedCount, pendingCount, hasTodos } = useSelector(
    ({ read }) => ({
      activeCount: read(todos.activeTodoCount$),
      completedCount: read(todos.completedTodoCount$),
      pendingCount: read(sync.pendingCount$),
      hasTodos: read(todos.hasTodos$),
    })
  );

  return {
    activeCount,
    completedCount,
    pendingCount,
    hasTodos,
  };
}

/**
 * Todo stats footer component.
 *
 * @example
 * ```tsx
 * <TodoStats />
 * ```
 */
export function TodoStats() {
  const pureProps = useTodoStatsLogic();
  return <TodoStatsPure {...pureProps} />;
}
