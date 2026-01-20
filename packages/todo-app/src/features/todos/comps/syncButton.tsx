/**
 * Sync button component.
 *
 * @description
 * Button to trigger manual sync with server.
 * Shows sync status and loading state.
 *
 * @businessRules
 * - Disabled when offline or already syncing
 * - Shows spinning icon during sync
 * - Triggers both sync and todos reload
 */

import { useSelector } from "atomirx/react";
import { RefreshCw } from "lucide-react";
import { syncStore } from "@/features/sync/stores/sync.store";
import { Button } from "@/ui";
import { cn } from "@/shared/utils";

/**
 * Sync button props.
 */
export interface SyncButtonProps {
  /** Callback when sync is triggered */
  onSync: () => Promise<void>;
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
  const sync = syncStore();
  const { syncStatus, isSyncing } = useSelector(({ read }) => ({
    syncStatus: read(sync.syncStatus$),
    isSyncing: read(sync.isSyncing$),
  }));

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onSync}
      disabled={isSyncing || syncStatus === "offline"}
      leftIcon={
        <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
      }
    >
      {isSyncing ? "Syncing..." : "Sync"}
    </Button>
  );
}
