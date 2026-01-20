/**
 * Types for the storage service.
 *
 * @description
 * Defines interfaces for storing and retrieving encrypted todos.
 */

/**
 * Decrypted todo for application use.
 */
export interface Todo {
  /** UUID v4 identifier */
  id: string;
  /** Plaintext content */
  content: string;
  /** Whether the todo is completed */
  completed: boolean;
  /** Unix timestamp (ms) when created */
  createdAt: number;
  /** Unix timestamp (ms) when last updated */
  updatedAt: number;
  /** Current sync status with server */
  syncStatus: "pending" | "synced" | "conflict";
  /** Server-assigned ID from jsonplaceholder (if synced) */
  serverId?: number;
  /** Soft delete flag for sync */
  deleted?: boolean;
}

/**
 * Input for creating a new todo.
 */
export interface CreateTodoInput {
  /** Plaintext content */
  content: string;
  /** Initial completion status (default: false) */
  completed?: boolean;
}

/**
 * Input for updating an existing todo.
 */
export interface UpdateTodoInput {
  /** New content (will be encrypted) */
  content?: string;
  /** New completion status */
  completed?: boolean;
  /** New sync status */
  syncStatus?: "pending" | "synced" | "conflict";
  /** Server ID after sync */
  serverId?: number;
}

/**
 * Filter options for querying todos.
 */
export interface TodoFilter {
  /** Filter by completion status */
  completed?: boolean;
  /** Filter by sync status */
  syncStatus?: "pending" | "synced" | "conflict";
  /** Include soft-deleted todos */
  includeDeleted?: boolean;
}

/**
 * Storage service interface.
 */
export interface StorageService {
  /**
   * Initialize the storage service with an encryption key.
   * Must be called before any other operations.
   *
   * @param key - CryptoKey for encryption/decryption
   */
  initialize(key: CryptoKey): void;

  /**
   * Check if the storage service has been initialized.
   */
  isInitialized(): boolean;

  /**
   * Get all todos, optionally filtered.
   *
   * @param filter - Optional filter criteria
   * @returns Array of decrypted todos
   */
  getTodos(filter?: TodoFilter): Promise<Todo[]>;

  /**
   * Get a single todo by ID.
   *
   * @param id - Todo ID
   * @returns Decrypted todo or null if not found
   */
  getTodo(id: string): Promise<Todo | null>;

  /**
   * Create a new todo.
   *
   * @param input - Todo creation input
   * @returns Created todo with ID and timestamps
   */
  createTodo(input: CreateTodoInput): Promise<Todo>;

  /**
   * Update an existing todo.
   *
   * @param id - Todo ID
   * @param input - Update input
   * @returns Updated todo or null if not found
   */
  updateTodo(id: string, input: UpdateTodoInput): Promise<Todo | null>;

  /**
   * Soft delete a todo (marks as deleted for sync).
   *
   * @param id - Todo ID
   * @returns Whether the todo was deleted
   */
  deleteTodo(id: string): Promise<boolean>;

  /**
   * Hard delete a todo (removes from database).
   *
   * @param id - Todo ID
   * @returns Whether the todo was deleted
   */
  hardDeleteTodo(id: string): Promise<boolean>;

  /**
   * Get all pending operations for sync.
   */
  getPendingOperations(): Promise<StoredOperation[]>;

  /**
   * Clear completed operations after sync.
   *
   * @param operationIds - IDs of operations to clear
   */
  clearOperations(operationIds: string[]): Promise<void>;

  /**
   * Store a credential after passkey registration.
   */
  storeCredential(credential: StoredCredentialInput): Promise<void>;

  /**
   * Get all stored credentials.
   */
  getCredentials(): Promise<StoredCredential[]>;

  /**
   * Get stored credentials without requiring initialization.
   * Used for checking existing credentials before login.
   */
  getCredentialsForLogin(): Promise<StoredCredential[]>;

  /**
   * Update credential last used timestamp.
   */
  updateCredentialLastUsed(credentialId: string): Promise<void>;

  /**
   * Delete a credential.
   */
  deleteCredential(credentialId: string): Promise<void>;

  /**
   * Get sync metadata.
   */
  getSyncMeta(): Promise<SyncMeta | null>;

  /**
   * Update sync metadata.
   */
  updateSyncMeta(meta: Partial<SyncMeta>): Promise<void>;

  /**
   * Clear all data (for logout).
   */
  clearAllData(): Promise<void>;
}

/**
 * Stored credential input.
 */
export interface StoredCredentialInput {
  credentialId: string;
  publicKey: string;
  displayName: string;
  prfSalt: string;
  hasPRF: boolean;
}

/**
 * Stored credential.
 */
export interface StoredCredential {
  credentialId: string;
  publicKey: string;
  displayName: string;
  prfSalt: string;
  hasPRF: boolean;
  createdAt: number;
  lastUsedAt: number;
}

/**
 * Sync metadata.
 */
export interface SyncMeta {
  id: string;
  lastSyncAt: number;
  pendingCount: number;
}

/**
 * Stored operation (from db.ts).
 */
export interface StoredOperation {
  id: string;
  type: "create" | "update" | "delete";
  todoId: string;
  timestamp: number;
  payload: string;
}
