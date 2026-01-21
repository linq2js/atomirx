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
 * import { storageService } from "@/features/todos";
 * import { cryptoService } from "@/features/auth";
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
} from "../types/storageTypes";
import {
  getDatabase,
  type EncryptedTodo,
  type StoredCredential as DBStoredCredential,
} from "./db";
import {
  cryptoService,
  type EncryptedField,
} from "@/features/auth/services/cryptoService";
import { generateId, now } from "@/shared/utils";

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

  /**
   * Initialize the storage service with an encryption key.
   *
   * @description
   * Must be called before any other operations. The encryption key
   * is used for all encrypt/decrypt operations on todo content.
   *
   * @param key - AES-256-GCM CryptoKey for encryption/decryption
   *
   * @example
   * ```ts
   * const storage = storageService();
   * storage.initialize(encryptionKey);
   * // Now ready for operations
   * ```
   */
  function initialize(key: CryptoKey): void {
    console.log(`[Storage:${instanceId}] Initializing with encryption key`);
    encryptionKey = key;
  }

  /**
   * Check if the storage service is initialized.
   *
   * @returns true if initialized with encryption key, false otherwise
   *
   * @example
   * ```ts
   * if (!storage.isInitialized()) {
   *   throw new Error("Must login first");
   * }
   * ```
   */
  function isInitialized(): boolean {
    const result = encryptionKey !== null;
    console.log(`[Storage:${instanceId}] isInitialized() = ${result}`);
    return result;
  }

  /**
   * Get todos from storage with optional filtering.
   *
   * @param filter - Optional filter criteria
   * @param filter.completed - Filter by completion status
   * @param filter.syncStatus - Filter by sync status
   * @param filter.includeDeleted - Include soft-deleted todos (default: false)
   * @returns Array of decrypted todos matching filter
   * @throws {StorageNotInitializedError} If service not initialized
   *
   * @example
   * ```ts
   * // Get all active todos
   * const active = await storage.getTodos({ completed: false });
   *
   * // Get pending sync todos
   * const pending = await storage.getTodos({ syncStatus: "pending" });
   * ```
   */
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

  /**
   * Get a single todo by ID.
   *
   * @param id - Todo UUID
   * @returns Decrypted todo or null if not found
   * @throws {StorageNotInitializedError} If service not initialized
   *
   * @example
   * ```ts
   * const todo = await storage.getTodo("abc-123");
   * if (todo) {
   *   console.log(todo.content);
   * }
   * ```
   */
  async function getTodo(id: string): Promise<Todo | null> {
    ensureInitialized();

    const encrypted = await db.todos.get(id);
    if (!encrypted) return null;

    return toTodo(encrypted);
  }

  /**
   * Create a new todo with encrypted content.
   *
   * @param input - Todo creation input
   * @param input.content - Todo content (will be encrypted)
   * @param input.completed - Initial completion status (default: false)
   * @returns Created todo with generated ID and timestamps
   * @throws {StorageNotInitializedError} If service not initialized
   *
   * @example
   * ```ts
   * const todo = await storage.createTodo({
   *   content: "Buy groceries",
   *   completed: false,
   * });
   * console.log(todo.id); // Generated UUID
   * ```
   */
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

  /**
   * Update an existing todo.
   *
   * @param id - Todo UUID to update
   * @param input - Fields to update (partial)
   * @param input.content - New content (will be encrypted)
   * @param input.completed - New completion status
   * @param input.syncStatus - New sync status
   * @param input.serverId - Server-assigned ID after sync
   * @returns Updated todo or null if not found
   * @throws {StorageNotInitializedError} If service not initialized
   *
   * @example
   * ```ts
   * const updated = await storage.updateTodo(todo.id, {
   *   completed: true,
   * });
   * ```
   */
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

  /**
   * Soft delete a todo (marks as deleted for sync).
   *
   * @description
   * Marks the todo as deleted but keeps it in storage until synced.
   * Use hardDeleteTodo for permanent removal.
   *
   * @param id - Todo UUID to delete
   * @returns true if deleted, false if not found
   * @throws {StorageNotInitializedError} If service not initialized
   *
   * @example
   * ```ts
   * const deleted = await storage.deleteTodo(todo.id);
   * // Todo still exists with deleted=true until sync
   * ```
   */
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

  /**
   * Permanently delete a todo from storage.
   *
   * @description
   * Removes the todo completely from IndexedDB.
   * Used after successful sync of delete operation.
   *
   * @param id - Todo UUID to permanently delete
   * @returns true if deleted, false if not found
   * @throws {StorageNotInitializedError} If service not initialized
   *
   * @example
   * ```ts
   * // After sync confirms deletion
   * await storage.hardDeleteTodo(todo.id);
   * ```
   */
  async function hardDeleteTodo(id: string): Promise<boolean> {
    ensureInitialized();

    const existing = await db.todos.get(id);
    if (!existing) return false;

    await db.todos.delete(id);
    return true;
  }

  /**
   * Get all pending operations for sync.
   *
   * @description
   * Returns operations in chronological order for processing.
   * Each operation represents a create/update/delete that needs syncing.
   *
   * @returns Array of pending operations ordered by timestamp
   * @throws {StorageNotInitializedError} If service not initialized
   *
   * @example
   * ```ts
   * const ops = await storage.getPendingOperations();
   * for (const op of ops) {
   *   await syncToServer(op);
   * }
   * ```
   */
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

  /**
   * Clear completed operations after successful sync.
   *
   * @param operationIds - Array of operation IDs to clear
   * @throws {StorageNotInitializedError} If service not initialized
   *
   * @example
   * ```ts
   * const ops = await storage.getPendingOperations();
   * const syncedIds = await syncBatch(ops);
   * await storage.clearOperations(syncedIds);
   * ```
   */
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

  /**
   * Store a passkey credential for future authentication.
   *
   * @param input - Credential data to store
   * @param input.credentialId - WebAuthn credential ID (base64url)
   * @param input.publicKey - Public key (base64url)
   * @param input.displayName - User display name
   * @param input.prfSalt - Salt for PRF evaluation (base64)
   * @param input.hasPRF - Whether PRF extension was supported
   * @throws {StorageNotInitializedError} If service not initialized
   *
   * @example
   * ```ts
   * await storage.storeCredential({
   *   credentialId: result.credentialId,
   *   publicKey: result.publicKey,
   *   displayName: "user@example.com",
   *   prfSalt: arrayBufferToBase64(prfSalt),
   *   hasPRF: true,
   * });
   * ```
   */
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

  /**
   * Get all stored credentials.
   *
   * @returns Array of stored credentials
   * @throws {StorageNotInitializedError} If service not initialized
   *
   * @example
   * ```ts
   * const credentials = await storage.getCredentials();
   * // Show credential picker to user
   * ```
   */
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

  /**
   * Update the last used timestamp for a credential.
   *
   * @param credentialId - Credential ID to update
   * @throws {StorageNotInitializedError} If service not initialized
   *
   * @example
   * ```ts
   * // After successful authentication
   * await storage.updateCredentialLastUsed(usedCredentialId);
   * ```
   */
  async function updateCredentialLastUsed(credentialId: string): Promise<void> {
    ensureInitialized();

    await db.credentials.update(credentialId, { lastUsedAt: now() });
  }

  /**
   * Delete a stored credential.
   *
   * @param credentialId - Credential ID to delete
   * @throws {StorageNotInitializedError} If service not initialized
   *
   * @example
   * ```ts
   * // User revokes a passkey
   * await storage.deleteCredential(credentialId);
   * ```
   */
  async function deleteCredential(credentialId: string): Promise<void> {
    ensureInitialized();

    await db.credentials.delete(credentialId);
  }

  /**
   * Get sync metadata.
   *
   * @returns Sync metadata or null if never synced
   * @throws {StorageNotInitializedError} If service not initialized
   *
   * @example
   * ```ts
   * const meta = await storage.getSyncMeta();
   * if (meta) {
   *   console.log(`Last sync: ${new Date(meta.lastSyncAt)}`);
   *   console.log(`Pending: ${meta.pendingCount}`);
   * }
   * ```
   */
  async function getSyncMeta(): Promise<SyncMeta | null> {
    ensureInitialized();

    const meta = await db.syncMeta.get("sync-meta");
    return meta ?? null;
  }

  /**
   * Update sync metadata.
   *
   * @param updates - Partial sync metadata to update
   * @param updates.lastSyncAt - Timestamp of last sync
   * @param updates.pendingCount - Number of pending operations
   * @throws {StorageNotInitializedError} If service not initialized
   *
   * @example
   * ```ts
   * await storage.updateSyncMeta({
   *   lastSyncAt: Date.now(),
   *   pendingCount: 0,
   * });
   * ```
   */
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

  /**
   * Clear all stored data (for logout/reset).
   *
   * @description
   * Removes all todos, credentials, sync metadata, operations, and settings.
   * This is a destructive operation - data cannot be recovered.
   *
   * @throws {StorageNotInitializedError} If service not initialized
   *
   * @example
   * ```ts
   * // On logout
   * await storage.clearAllData();
   * ```
   */
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
