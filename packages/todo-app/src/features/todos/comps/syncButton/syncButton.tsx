/**
 * Sync button component.
 *
 * @description
 * Button to trigger manual sync with server.
 * Shows sync status and loading state.
 */

import { useSelector } from "atomirx/react";
import { syncStore } from "@/features/sync/stores/syncStore";
import { SyncButtonPure, type SyncButtonPureProps } from "./syncButton.pure";

/**
 * Sync button props.
 */
export interface SyncButtonProps {
  /** Callback when sync is triggered */
  onSync: () => Promise<void>;
}

/**
 * SyncButton logic hook return type.
 */
export type UseSyncButtonLogicReturn = SyncButtonPureProps;

/**
 * SyncButton logic hook.
 *
 * @description
 * Connects sync button to sync store.
 *
 * @param onSync - Callback when sync is triggered
 * @returns Sync button state and handlers
 */
export function useSyncButtonLogic(
  onSync: () => Promise<void>
): UseSyncButtonLogicReturn {
  const sync = syncStore();
  const { syncStatus, isSyncing } = useSelector(({ read }) => ({
    syncStatus: read(sync.syncStatus$),
    isSyncing: read(sync.isSyncing$),
  }));

  return {
    isSyncing,
    disabled: isSyncing || syncStatus === "offline",
    onSync,
  };
}

/**
 * Sync button component.
 *
 * @example
 * ```tsx
 * <SyncButton onSync={handleSync} />
 * ```
 */
export function SyncButton({ onSync }: SyncButtonProps) {
  const pureProps = useSyncButtonLogic(onSync);
  return <SyncButtonPure {...pureProps} />;
}
