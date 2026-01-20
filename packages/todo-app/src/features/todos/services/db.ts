/**
 * Dexie database schema definition.
 *
 * @description
 * Defines the IndexedDB schema for the todo app using Dexie.js.
 * All sensitive data (todo content) is encrypted before storage.
 */

import Dexie, { type Table } from "dexie";

/**
 * Encrypted todo stored in IndexedDB.
 * The `content` field contains encrypted ciphertext.
 */
export interface EncryptedTodo {
  /** UUID v4 identifier */
  id: string;
  /** Encrypted content (JSON string of EncryptedField) */
  encryptedContent: string;
  /** Whether the todo is completed */
  completed: boolean;
  /** Unix timestamp (ms) when created */
  createdAt: number;
  /** Unix timestamp (ms) when last updated - used for LWW conflict resolution */
  updatedAt: number;
  /** Current sync status with server */
  syncStatus: "pending" | "synced" | "conflict";
  /** Server-assigned ID from jsonplaceholder (if synced) */
  serverId?: number;
  /** Soft delete flag for sync */
  deleted?: boolean;
}

/**
 * User credential stored locally after passkey registration.
 */
export interface StoredCredential {
  /** Credential ID (base64url encoded) - primary key */
  credentialId: string;
  /** Public key (base64url encoded) */
  publicKey: string;
  /** Display name */
  displayName: string;
  /** Salt used for PRF evaluation (base64) */
  prfSalt: string;
  /** Whether PRF was supported when registered */
  hasPRF: boolean;
  /** Unix timestamp when created */
  createdAt: number;
  /** Unix timestamp when last used */
  lastUsedAt: number;
}

/**
 * Metadata about sync state.
 */
export interface SyncMeta {
  /** Unique identifier (always "sync-meta") */
  id: string;
  /** Unix timestamp of last successful sync */
  lastSyncAt: number;
  /** Number of pending operations */
  pendingCount: number;
}

/**
 * Operation log entry for offline sync.
 */
export interface StoredOperation {
  /** UUID v4 identifier - primary key */
  id: string;
  /** Type of operation */
  type: "create" | "update" | "delete";
  /** ID of the todo this operation affects */
  todoId: string;
  /** Unix timestamp when operation was created */
  timestamp: number;
  /** Serialized partial todo data (encrypted content) */
  payload: string;
}

/**
 * App settings stored locally.
 */
export interface AppSettings {
  /** Settings key - primary key */
  key: string;
  /** Settings value (JSON string) */
  value: string;
}

/**
 * Dexie database class for the todo app.
 */
export class TodoDatabase extends Dexie {
  todos!: Table<EncryptedTodo>;
  credentials!: Table<StoredCredential>;
  syncMeta!: Table<SyncMeta>;
  operations!: Table<StoredOperation>;
  settings!: Table<AppSettings>;

  constructor() {
    super("secure-todo-db");

    this.version(1).stores({
      // Primary key is 'id', indexes on completion status, update time, sync status, server ID
      todos: "id, completed, updatedAt, syncStatus, serverId, deleted",
      // Primary key is 'credentialId'
      credentials: "credentialId, createdAt",
      // Primary key is 'id' (singleton)
      syncMeta: "id",
      // Primary key is 'id', indexes on todoId and timestamp for ordering
      operations: "id, todoId, timestamp",
      // Primary key is 'key'
      settings: "key",
    });
  }
}

/**
 * Singleton database instance.
 */
let _db: TodoDatabase | null = null;

/**
 * Get the database instance.
 *
 * @returns TodoDatabase instance
 */
export function getDatabase(): TodoDatabase {
  if (!_db) {
    _db = new TodoDatabase();
  }
  return _db;
}

/**
 * Close and reset the database (useful for tests).
 */
export async function resetDatabase(): Promise<void> {
  if (_db) {
    await _db.delete();
    _db = null;
  }
}
