/**
 * SyncButton presentation component.
 *
 * @description
 * Pure presentation component for SyncButton.
 *
 * @businessRules
 * - Disabled when offline or already syncing
 * - Shows spinning icon during sync
 */

import { RefreshCw } from "lucide-react";
import { Button } from "@/ui";
import { cn } from "@/shared/utils";

/**
 * SyncButton pure component props.
 */
export interface SyncButtonPureProps {
  /** Whether syncing is in progress */
  isSyncing: boolean;
  /** Whether button is disabled */
  disabled: boolean;
  /** Handle sync click */
  onSync: () => Promise<void>;
}

/**
 * SyncButton pure presentation component.
 *
 * @example
 * ```tsx
 * <SyncButtonPure isSyncing={false} disabled={false} onSync={handleSync} />
 * ```
 */
export function SyncButtonPure({ isSyncing, disabled, onSync }: SyncButtonPureProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onSync}
      disabled={disabled}
      leftIcon={
        <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
      }
    >
      {isSyncing ? "Syncing..." : "Sync"}
    </Button>
  );
}
