/**
 * Sync feature public API.
 *
 * @example
 * ```ts
 * import { syncStore } from "@/features/sync";
 *
 * const sync = syncStore();
 * await sync.loadSyncMeta();
 * await sync.sync();
 * ```
 */

export { syncStore } from "./stores";
export type { SyncStatusType, SyncError } from "./stores";
