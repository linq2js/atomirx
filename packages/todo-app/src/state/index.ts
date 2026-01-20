/**
 * State stores for the Todo App.
 *
 * @description
 * Exports all atomirx-based state stores for managing application state.
 * Each store is a lazy singleton created with define().
 *
 * @example
 * ```ts
 * import { authStore, todosStore, syncStore, networkStore } from '@/state';
 *
 * // Get store instances
 * const auth = authStore();
 * const todos = todosStore();
 * const sync = syncStore();
 * const network = networkStore();
 *
 * // Use in React
 * const user = useSelector(auth.user$);
 * const filteredTodos = useSelector(todos.filteredTodos$);
 * ```
 */

export { authStore } from "./auth.store";
export type { User, AuthSupportInfo, AuthError } from "./auth.store";

export { todosStore } from "./todos.store";
export type { TodoFilterType, TodoError } from "./todos.store";

export { syncStore } from "./sync.store";
export type { SyncStatusType, SyncError } from "./sync.store";

export { networkStore } from "./network.store";
