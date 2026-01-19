/**
 * State modules for the Todo App.
 *
 * @description
 * Exports all atomirx-based state modules for managing application state.
 * Each module is a lazy singleton created with define().
 *
 * @example
 * ```ts
 * import { authModule, todosModule, syncModule, networkModule } from '@/state';
 *
 * // Get module instances
 * const auth = authModule();
 * const todos = todosModule();
 * const sync = syncModule();
 * const network = networkModule();
 *
 * // Use in React
 * const user = useSelector(auth.user$);
 * const filteredTodos = useSelector(todos.filteredTodos$);
 * ```
 */

export { authModule } from "./auth.module";
export type { User, AuthSupportInfo, AuthError } from "./auth.module";

export { todosModule } from "./todos.module";
export type { TodoFilterType, TodoError } from "./todos.module";

export { syncModule } from "./sync.module";
export type { SyncStatusType, SyncError } from "./sync.module";

export { networkModule } from "./network.module";
