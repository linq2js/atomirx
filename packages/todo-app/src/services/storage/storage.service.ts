/**
 * Storage service for encrypted todo storage.
 *
 * @description
 * Provides encrypted storage for todos using IndexedDB (Dexie.js).
 * All sensitive data is encrypted before storage and decrypted on retrieval.
 *
 * Features:
 * - Transparent encryption/decryption of todo content
 * - Operation logging for offline sync
 * - Credential storage for passkey management
 * - Sync metadata tracking
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

import { define } from "atomirx";
import type {
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
import {
  getDatabase,
  type EncryptedTodo,
  type StoredCredential as DBStoredCredential,
} from "./db";
import { cryptoService, type EncryptedField } from "../crypto";
import { generateId, now } from "@/lib/utils";

/**
 * Error thrown when storage service is not initialized.
 */
class StorageNotInitializedError extends Error {
  constructor() {
    super("Storage service not initialized. Call initialize() first.");
    this.name = "StorageNotInitializedError";
  }
}

/**
 * Storage service module.
 *
 * Provides encrypted storage for todos using IndexedDB.
 * Use `storageService()` to get the singleton instance.
 *
 * @example
 * ```ts
 * const storage = storageService();
 * storage.initialize(encryptionKey);
 *
 * const todo = await storage.createTodo({ content: "Buy groceries" });
 * ```
 */
export const storageService = define((): StorageService => {
  const db = getDatabase();
  const crypto = cryptoService();
  let encryptionKey: CryptoKey | null = null;
  const instanceId = Math.random().toString(36).slice(2, 8);
  console.log(`[Storage] Created storage service instance: ${instanceId}`);

  /**
   * Ensure the service is initialized.
   */
  function ensureInitialized(): void {
    if (!encryptionKey) {
      throw new StorageNotInitializedError();
    }
  }

  /**
   * Encrypt todo content.
   */
  async function encryptContent(content: string): Promise<string> {
    ensureInitialized();
    const encrypted = await crypto.encrypt(encryptionKey!, content);
    return JSON.stringify(encrypted);
  }

  /**
   * Decrypt todo content.
   */
  async function decryptContent(encryptedContent: string): Promise<string> {
    ensureInitialized();
    const encrypted: EncryptedField = JSON.parse(encryptedContent);
    return crypto.decrypt(encryptionKey!, encrypted);
  }

  /**
   * Convert encrypted DB todo to decrypted todo.
   */
  async function toTodo(encrypted: EncryptedTodo): Promise<Todo> {
    return {
      id: encrypted.id,
      content: await decryptContent(encrypted.encryptedContent),
      completed: encrypted.completed,
      createdAt: encrypted.createdAt,
      updatedAt: encrypted.updatedAt,
      syncStatus: encrypted.syncStatus,
      serverId: encrypted.serverId,
      deleted: encrypted.deleted,
    };
  }

  /**
   * Log an operation for sync.
   */
  async function logOperation(
    type: "create" | "update" | "delete",
    todoId: string,
    payload: Partial<Todo>
  ): Promise<void> {
    await db.operations.add({
      id: generateId(),
      type,
      todoId,
      timestamp: now(),
      payload: JSON.stringify(payload),
    });

    // Update pending count in sync meta
    const meta = await db.syncMeta.get("sync-meta");
    if (meta) {
      await db.syncMeta.update("sync-meta", {
        pendingCount: meta.pendingCount + 1,
      });
    }
  }

  // =========================================================================
  // Public API
  // =========================================================================

  function initialize(key: CryptoKey): void {
    console.log(`[Storage:${instanceId}] Initializing with encryption key`);
    encryptionKey = key;
  }

  function isInitialized(): boolean {
    const result = encryptionKey !== null;
    console.log(`[Storage:${instanceId}] isInitialized() = ${result}`);
    return result;
  }

  async function getTodos(filter?: TodoFilter): Promise<Todo[]> {
    ensureInitialized();

    // Get all todos first, then filter in memory
    // (Dexie has issues with boolean indexing on some backends)
    let todos = await db.todos.toArray();

    // Apply filters
    if (filter?.completed !== undefined) {
      todos = todos.filter((t) => t.completed === filter.completed);
    }

    if (filter?.syncStatus) {
      todos = todos.filter((t) => t.syncStatus === filter.syncStatus);
    }

    // Filter out deleted unless requested
    if (!filter?.includeDeleted) {
      todos = todos.filter((t) => !t.deleted);
    }

    // Decrypt all todos
    return Promise.all(todos.map(toTodo));
  }

  async function getTodo(id: string): Promise<Todo | null> {
    ensureInitialized();

    const encrypted = await db.todos.get(id);
    if (!encrypted) return null;

    return toTodo(encrypted);
  }

  async function createTodo(input: CreateTodoInput): Promise<Todo> {
    ensureInitialized();

    const id = generateId();
    const timestamp = now();

    const encrypted: EncryptedTodo = {
      id,
      encryptedContent: await encryptContent(input.content),
      completed: input.completed ?? false,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: "pending",
    };

    await db.todos.add(encrypted);

    // Log operation for sync
    const todo = await toTodo(encrypted);
    await logOperation("create", id, todo);

    return todo;
  }

  async function updateTodo(
    id: string,
    input: UpdateTodoInput
  ): Promise<Todo | null> {
    ensureInitialized();

    const existing = await db.todos.get(id);
    if (!existing) return null;

    const updates: Partial<EncryptedTodo> = {
      updatedAt: now(),
    };

    if (input.content !== undefined) {
      updates.encryptedContent = await encryptContent(input.content);
    }

    if (input.completed !== undefined) {
      updates.completed = input.completed;
    }

    if (input.syncStatus !== undefined) {
      updates.syncStatus = input.syncStatus;
    }

    if (input.serverId !== undefined) {
      updates.serverId = input.serverId;
    }

    await db.todos.update(id, updates);

    const updated = await db.todos.get(id);
    if (!updated) return null;

    const todo = await toTodo(updated);

    // Log operation for sync (unless just updating sync status)
    if (input.content !== undefined || input.completed !== undefined) {
      await logOperation("update", id, todo);
    }

    return todo;
  }

  async function deleteTodo(id: string): Promise<boolean> {
    ensureInitialized();

    const existing = await db.todos.get(id);
    if (!existing) return false;

    // Soft delete
    await db.todos.update(id, {
      deleted: true,
      updatedAt: now(),
      syncStatus: "pending",
    });

    // Log operation for sync
    await logOperation("delete", id, { id, deleted: true });

    return true;
  }

  async function hardDeleteTodo(id: string): Promise<boolean> {
    ensureInitialized();

    const existing = await db.todos.get(id);
    if (!existing) return false;

    await db.todos.delete(id);
    return true;
  }

  async function getPendingOperations(): Promise<StoredOperation[]> {
    ensureInitialized();

    const operations = await db.operations.orderBy("timestamp").toArray();
    return operations.map((op) => ({
      id: op.id,
      type: op.type,
      todoId: op.todoId,
      timestamp: op.timestamp,
      payload: op.payload,
    }));
  }

  async function clearOperations(operationIds: string[]): Promise<void> {
    ensureInitialized();

    await db.operations.bulkDelete(operationIds);

    // Update pending count in sync meta
    const meta = await db.syncMeta.get("sync-meta");
    if (meta) {
      const remaining = await db.operations.count();
      await db.syncMeta.update("sync-meta", { pendingCount: remaining });
    }
  }

  async function storeCredential(input: StoredCredentialInput): Promise<void> {
    ensureInitialized();

    const timestamp = now();

    const credential: DBStoredCredential = {
      credentialId: input.credentialId,
      publicKey: input.publicKey,
      displayName: input.displayName,
      prfSalt: input.prfSalt,
      hasPRF: input.hasPRF,
      createdAt: timestamp,
      lastUsedAt: timestamp,
    };

    await db.credentials.put(credential);
  }

  async function getCredentials(): Promise<StoredCredential[]> {
    ensureInitialized();

    return db.credentials.toArray();
  }

  /**
   * Get stored credentials WITHOUT requiring initialization.
   * Used for checking existing credentials before login.
   * Credentials are public data (no encryption needed).
   */
  async function getCredentialsForLogin(): Promise<StoredCredential[]> {
    return db.credentials.toArray();
  }

  async function updateCredentialLastUsed(credentialId: string): Promise<void> {
    ensureInitialized();

    await db.credentials.update(credentialId, { lastUsedAt: now() });
  }

  async function deleteCredential(credentialId: string): Promise<void> {
    ensureInitialized();

    await db.credentials.delete(credentialId);
  }

  async function getSyncMeta(): Promise<SyncMeta | null> {
    ensureInitialized();

    const meta = await db.syncMeta.get("sync-meta");
    return meta ?? null;
  }

  async function updateSyncMeta(updates: Partial<SyncMeta>): Promise<void> {
    ensureInitialized();

    const existing = await db.syncMeta.get("sync-meta");

    if (existing) {
      await db.syncMeta.update("sync-meta", updates);
    } else {
      await db.syncMeta.add({
        id: "sync-meta",
        lastSyncAt: updates.lastSyncAt ?? 0,
        pendingCount: updates.pendingCount ?? 0,
      });
    }
  }

  async function clearAllData(): Promise<void> {
    ensureInitialized();

    await db.todos.clear();
    await db.credentials.clear();
    await db.syncMeta.clear();
    await db.operations.clear();
    await db.settings.clear();
  }

  return {
    initialize,
    isInitialized,
    getTodos,
    getTodo,
    createTodo,
    updateTodo,
    deleteTodo,
    hardDeleteTodo,
    getPendingOperations,
    clearOperations,
    storeCredential,
    getCredentials,
    getCredentialsForLogin,
    updateCredentialLastUsed,
    deleteCredential,
    getSyncMeta,
    updateSyncMeta,
    clearAllData,
  };
});
