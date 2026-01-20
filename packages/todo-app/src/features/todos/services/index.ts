/**
 * Todos feature services.
 *
 * @example
 * ```ts
 * import { storageService } from "@/features/todos";
 *
 * const storage = storageService();
 * storage.initialize(encryptionKey);
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
