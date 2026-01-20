/**
 * Todos feature public API.
 *
 * @description
 * Provides encrypted todo storage and management.
 *
 * @example
 * ```ts
 * import { todosStore, storageService, TodoItem, TodosPage } from "@/features/todos";
 *
 * // Get store instance
 * const todos = todosStore();
 *
 * // Load todos (after auth)
 * await todos.loadTodos();
 *
 * // Add todo
 * await todos.addTodo("Buy groceries");
 * ```
 */

// Domain components
export { TodoItem, TodoInput } from "./domain";
export type { TodoItemProps, TodoInputProps } from "./domain";

// Services
export { storageService, getDatabase, resetDatabase, TodoDatabase } from "./services";
export type {
  EncryptedTodo,
  DBStoredCredential,
  DBSyncMeta,
  DBStoredOperation,
  AppSettings,
} from "./services";

// Stores
export { todosStore } from "./stores";
export type { TodoFilterType, TodoError } from "./stores";

// Pages
export { TodosPage } from "./pages";

// Types
export type {
  StorageService,
  Todo,
  CreateTodoInput,
  UpdateTodoInput,
  TodoFilter,
  StoredCredentialInput,
  StoredCredential,
  SyncMeta,
  StoredOperation,
} from "./types";
