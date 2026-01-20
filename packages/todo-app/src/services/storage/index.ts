/**
 * Storage service module.
 *
 * @description
 * Provides encrypted storage for todos using IndexedDB.
 *
 * @example
 * ```ts
 * import { storageService } from "@/services/storage";
 * import { cryptoService } from "@/services/crypto";
 *
 * // Initialize with encryption key
 * const crypto = cryptoService();
 * const key = await crypto.generateKey();
 *
 * const storage = storageService();
 * storage.initialize(key);
 *
 * // Create encrypted todo
 * const todo = await storage.createTodo({ content: "Buy groceries" });
 * ```
 */

export { storageService } from "./storage.service";
export { getDatabase, resetDatabase, TodoDatabase } from "./db";
export type {
  EncryptedTodo,
  StoredCredential as DBStoredCredential,
  SyncMeta as DBSyncMeta,
  StoredOperation as DBStoredOperation,
  AppSettings,
} from "./db";
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
} from "./storage.types";
