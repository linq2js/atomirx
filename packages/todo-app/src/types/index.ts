/**
 * Core type definitions for the Todo App.
 *
 * @description
 * This file contains all shared type definitions used across the application.
 * Types are organized by domain: Todo, Auth, Sync, and Crypto.
 */

// =============================================================================
// Todo Types
// =============================================================================

/**
 * Core Todo entity stored in IndexedDB.
 * The `content` field is encrypted at rest.
 */
export interface Todo {
  /** UUID v4 identifier */
  id: string;
  /** Encrypted todo content (ciphertext) */
  content: string;
  /** Whether the todo is completed */
  completed: boolean;
  /** Unix timestamp (ms) when created */
  createdAt: number;
  /** Unix timestamp (ms) when last updated - used for LWW conflict resolution */
  updatedAt: number;
  /** Current sync status with server */
  syncStatus: SyncStatus;
  /** Server-assigned ID from jsonplaceholder (if synced) */
  serverId?: number;
  /** Soft delete flag for sync */
  deleted?: boolean;
}

/**
 * Decrypted version of Todo for UI display.
 * Content has been decrypted from the stored ciphertext.
 */
export interface DecryptedTodo extends Omit<Todo, "content"> {
  /** Decrypted plaintext content */
  content: string;
}

export type SyncStatus = "pending" | "synced" | "conflict";

/**
 * Filter options for todo list display.
 */
export type TodoFilter = "all" | "active" | "completed";

// =============================================================================
// Auth Types
// =============================================================================

/**
 * User credential stored locally after passkey registration.
 */
export interface UserCredential {
  /** Credential ID from WebAuthn */
  credentialId: string;
  /** Public key for verification (base64) */
  publicKey: string;
  /** Wrapped Data Encryption Key (for non-PRF fallback) */
  wrappedDEK?: string;
  /** Salt used for key derivation (base64) */
  salt: string;
  /** Unix timestamp when credential was created */
  createdAt: number;
  /** Display name for the credential */
  displayName?: string;
}

/**
 * Current user session state.
 */
export interface User {
  /** Username/display name */
  username: string;
  /** Credential ID being used */
  credentialId: string;
  /** Whether user has biometric authentication enabled */
  hasBiometric: boolean;
}

/**
 * Result of checking WebAuthn/PRF support.
 */
export interface AuthSupport {
  /** Whether WebAuthn is supported at all */
  webauthn: boolean;
  /** Whether platform authenticator (biometric) is available */
  platformAuthenticator: boolean;
  /** Whether PRF extension is supported for key derivation */
  prfExtension: boolean;
  /** Whether conditional mediation (autofill) is supported */
  conditionalMediation: boolean;
}

/**
 * Result of passkey authentication.
 */
export interface AuthResult {
  /** Whether authentication was successful */
  success: boolean;
  /** Credential ID used */
  credentialId: string;
  /** PRF output for key derivation (if PRF supported) */
  prfOutput?: ArrayBuffer;
  /** Error message if authentication failed */
  error?: string;
}

// =============================================================================
// Sync Types
// =============================================================================

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
export interface Operation {
  /** UUID v4 identifier */
  id: string;
  /** Type of operation */
  type: OperationType;
  /** ID of the todo this operation affects */
  todoId: string;
  /** Unix timestamp when operation was created */
  timestamp: number;
  /** Partial todo data for the operation */
  payload: Partial<Todo>;
}

export type OperationType = "create" | "update" | "delete";

/**
 * Network connection state.
 */
export interface NetworkState {
  /** Whether device is online */
  isOnline: boolean;
  /** Whether we're currently syncing */
  isSyncing: boolean;
  /** Last sync error (if any) */
  lastError?: string;
}

// =============================================================================
// Crypto Types
// =============================================================================

/**
 * Encrypted field containing ciphertext and IV.
 */
export interface EncryptedField {
  /** Base64-encoded ciphertext */
  ciphertext: string;
  /** Base64-encoded IV used for encryption */
  iv: string;
}

/**
 * Key derivation configuration.
 */
export interface KeyDerivationConfig {
  /** Salt for PBKDF2/HKDF (base64) */
  salt: string;
  /** Number of iterations (for PBKDF2) */
  iterations?: number;
  /** Key length in bits */
  keyLength: number;
}

// =============================================================================
// Backup Types
// =============================================================================

/**
 * Backup file format for export/import.
 */
export interface BackupFile {
  /** Backup format version */
  version: 1;
  /** Unix timestamp when backup was created */
  exportedAt: number;
  /** Encrypted todos (still encrypted, user must re-auth to decrypt) */
  todos: Todo[];
  /** Pending operations */
  operations: Operation[];
  /** Salt needed for key derivation */
  salt: string;
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Result type for operations that can fail.
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Async result type.
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;
