/**
 * @module syncModule
 *
 * @description Manages sync state between local storage and remote server.
 * Tracks pending operations, sync status, and provides sync actions.
 *
 * @atoms
 * - isSyncing$ - Whether a sync operation is in progress
 * - lastSyncAt$ - Timestamp of last successful sync
 * - pendingCount$ - Number of pending operations
 * - syncError$ - Last sync error
 *
 * @derived
 * - hasPendingChanges$ - Whether there are unsaved changes
 * - syncStatus$ - Combined sync status (synced/pending/syncing/error)
 *
 * @actions
 * - sync() - Sync pending operations to server
 * - loadSyncMeta() - Load sync metadata from storage
 * - clearSyncError() - Clear last sync error
 *
 * @reactive-flow
 * sync() → [pending ops] → [jsonplaceholder API] → lastSyncAt$ + pendingCount$ updated
 * networkModule.isOnline$ change → auto-sync if online
 */

import { atom, derived, define, effect, batch, readonly } from "atomirx";
import { getStorageService } from "@/services/storage";
import { networkModule } from "./network.module";

/**
 * Sync status type.
 */
export type SyncStatusType =
  | "synced"
  | "pending"
  | "syncing"
  | "error"
  | "offline";

/**
 * Sync error with details.
 */
export interface SyncError {
  message: string;
  failedOperations?: string[];
  timestamp: number;
}

/** Base URL for jsonplaceholder API */
const API_BASE_URL = "https://jsonplaceholder.typicode.com";

/**
 * Sync state module.
 *
 * @example
 * ```ts
 * const sync = syncModule();
 *
 * // Load sync metadata on app start
 * await sync.loadSyncMeta();
 *
 * // Manual sync
 * await sync.sync();
 *
 * // In React component
 * const status = useSelector(sync.syncStatus$);
 * const pendingCount = useSelector(sync.pendingCount$);
 * ```
 */
export const syncModule = define(() => {
  // ┌─────────────────────────────────────────────────────────────┐
  // │ Dependency Graph:                                          │
  // │                                                            │
  // │  sync() / loadSyncMeta()                                   │
  // │         │                                                  │
  // │         ├──────────────┬──────────────┬──────────────┐     │
  // │         ▼              ▼              ▼              ▼     │
  // │    isSyncing$    lastSyncAt$   pendingCount$   syncError$  │
  // │         │              │              │              │     │
  // │         └──────────────┴──────────────┴──────────────┘     │
  // │                        │                                   │
  // │                        ▼                                   │
  // │  networkModule.isOnline$ ────► syncStatus$                 │
  // │                        │                                   │
  // │                        ▼                                   │
  // │               hasPendingChanges$                           │
  // │                                                            │
  // │  [auto-sync effect] ◄── networkModule.isOnline$ (true)     │
  // └─────────────────────────────────────────────────────────────┘

  const storageService = getStorageService();
  const network = networkModule();

  // ─────────────────────────────────────────────────────────────
  // Atoms
  // ─────────────────────────────────────────────────────────────

  /**
   * Whether a sync operation is currently in progress.
   */
  const isSyncing$ = atom<boolean>(false, {
    meta: { key: "sync.isSyncing" },
  });

  /**
   * Timestamp of last successful sync.
   * 0 means never synced.
   */
  const lastSyncAt$ = atom<number>(0, {
    meta: { key: "sync.lastSyncAt" },
  });

  /**
   * Number of pending operations waiting to sync.
   */
  const pendingCount$ = atom<number>(0, {
    meta: { key: "sync.pendingCount" },
  });

  /**
   * Last sync error.
   * Null if no error.
   */
  const syncError$ = atom<SyncError | null>(null, {
    meta: { key: "sync.error" },
  });

  // ─────────────────────────────────────────────────────────────
  // Derived
  // ─────────────────────────────────────────────────────────────

  /**
   * Whether there are pending changes to sync.
   */
  const hasPendingChanges$ = derived(({ read }) => {
    return read(pendingCount$) > 0;
  });

  /**
   * Combined sync status for UI display.
   */
  const syncStatus$ = derived(({ read }): SyncStatusType => {
    const isOnline = read(network.isOnline$);
    const isSyncing = read(isSyncing$);
    const hasPending = read(hasPendingChanges$);
    const error = read(syncError$);

    if (!isOnline) return "offline";
    if (isSyncing) return "syncing";
    if (error) return "error";
    if (hasPending) return "pending";
    return "synced";
  });

  // ─────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────

  /**
   * Auto-sync when coming back online.
   */
  effect(({ read }) => {
    const isOnline = read(network.isOnline$);
    const hasPending = read(hasPendingChanges$);
    const isSyncing = isSyncing$.get(); // Non-reactive read to avoid loop

    // Only sync if online, has pending changes, and not already syncing
    if (isOnline && hasPending && !isSyncing) {
      // Delay slightly to avoid rapid re-syncs
      const timeoutId = setTimeout(() => {
        void sync();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  });

  // ─────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────

  /**
   * Load sync metadata from storage.
   * Should be called after auth.
   */
  async function loadSyncMeta(): Promise<void> {
    try {
      const meta = await storageService.getSyncMeta();
      if (meta) {
        // Batch to trigger single notification
        batch(() => {
          lastSyncAt$.set(meta.lastSyncAt);
          pendingCount$.set(meta.pendingCount);
        });
      }
    } catch (err) {
      console.error("Failed to load sync meta:", err);
    }
  }

  /**
   * Sync pending operations to the server.
   * Uses jsonplaceholder API for mock sync.
   *
   * @returns Whether sync was successful
   */
  async function sync(): Promise<boolean> {
    // Skip if already syncing or offline
    if (isSyncing$.get() || !network.isOnline$.get()) {
      return false;
    }

    syncError$.set(null);
    isSyncing$.set(true);

    try {
      const operations = await storageService.getPendingOperations();

      if (operations.length === 0) {
        // Nothing to sync
        const timestamp = Date.now();
        lastSyncAt$.set(timestamp);
        await storageService.updateSyncMeta({ lastSyncAt: timestamp });
        return true;
      }

      const failedOperations: string[] = [];

      // Process operations in order
      for (const op of operations) {
        try {
          const payload = JSON.parse(op.payload);

          switch (op.type) {
            case "create": {
              // Create on jsonplaceholder
              const response = await fetch(`${API_BASE_URL}/todos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: payload.content,
                  completed: payload.completed ?? false,
                  userId: 1, // jsonplaceholder requires userId
                }),
              });

              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }

              const created = await response.json();

              // Update local todo with server ID
              await storageService.updateTodo(op.todoId, {
                serverId: created.id,
                syncStatus: "synced",
              });
              break;
            }

            case "update": {
              // Get current todo to find server ID
              const todo = await storageService.getTodo(op.todoId);
              if (!todo?.serverId) {
                // No server ID, skip (or handle as create)
                break;
              }

              await fetch(`${API_BASE_URL}/todos/${todo.serverId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: payload.content,
                  completed: payload.completed,
                }),
              });

              await storageService.updateTodo(op.todoId, {
                syncStatus: "synced",
              });
              break;
            }

            case "delete": {
              const todo = await storageService.getTodo(op.todoId);
              if (todo?.serverId) {
                await fetch(`${API_BASE_URL}/todos/${todo.serverId}`, {
                  method: "DELETE",
                });
              }

              // Hard delete after sync
              await storageService.hardDeleteTodo(op.todoId);
              break;
            }
          }
        } catch (err) {
          console.error(`Failed to sync operation ${op.id}:`, err);
          failedOperations.push(op.id);
        }
      }

      // Clear successful operations
      const successfulOps = operations
        .filter((op) => !failedOperations.includes(op.id))
        .map((op) => op.id);

      if (successfulOps.length > 0) {
        await storageService.clearOperations(successfulOps);
      }

      // Update sync metadata (batch to trigger single notification)
      const timestamp = Date.now();
      const remainingCount = failedOperations.length;

      batch(() => {
        lastSyncAt$.set(timestamp);
        pendingCount$.set(remainingCount);
      });
      await storageService.updateSyncMeta({
        lastSyncAt: timestamp,
        pendingCount: remainingCount,
      });

      if (failedOperations.length > 0) {
        syncError$.set({
          message: `Failed to sync ${failedOperations.length} operations`,
          failedOperations,
          timestamp,
        });
        return false;
      }

      return true;
    } catch (err) {
      syncError$.set({
        message: err instanceof Error ? err.message : "Sync failed",
        timestamp: Date.now(),
      });
      return false;
    } finally {
      isSyncing$.set(false);
    }
  }

  /**
   * Clear the sync error.
   */
  function clearSyncError(): void {
    syncError$.set(null);
  }

  /**
   * Update pending count (called when todos are modified).
   */
  function incrementPendingCount(): void {
    pendingCount$.set((prev) => prev + 1);
  }

  /**
   * Reset sync state (for logout).
   */
  function reset(): void {
    batch(() => {
      isSyncing$.set(false);
      lastSyncAt$.set(0);
      pendingCount$.set(0);
      syncError$.set(null);
    });
  }

  return {
    // Read-only state (prevents external mutations)
    ...readonly({
      isSyncing$,
      lastSyncAt$,
      pendingCount$,
      syncError$,
    }),

    // Derived state (already read-only by nature)
    hasPendingChanges$,
    syncStatus$,

    // Actions
    loadSyncMeta,
    sync,
    clearSyncError,
    incrementPendingCount,
    reset,
  };
});
