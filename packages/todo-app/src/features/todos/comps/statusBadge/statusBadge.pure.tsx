/**
 * StatusBadge presentation component.
 *
 * @description
 * Pure presentation component for StatusBadge.
 *
 * @businessRules
 * - synced: Green badge with "Synced" text
 * - pending: Yellow badge with "Pending" text
 * - syncing: Blue badge with "Syncing..." text
 * - error: Red badge with "Error" text
 * - offline: Gray badge with "Offline" text
 */

import { Badge, type BadgeVariant } from "@/ui";

/**
 * Status badge pure component props.
 */
export interface StatusBadgePureProps {
  /** Sync status */
  status: "synced" | "pending" | "syncing" | "error" | "offline";
  /** Additional class names */
  className?: string;
}

const statusConfig: Record<
  StatusBadgePureProps["status"],
  { variant: BadgeVariant; label: string; dot: boolean }
> = {
  synced: { variant: "success", label: "Synced", dot: true },
  pending: { variant: "warning", label: "Pending", dot: true },
  syncing: { variant: "info", label: "Syncing...", dot: true },
  error: { variant: "error", label: "Error", dot: true },
  offline: { variant: "secondary", label: "Offline", dot: true },
};

/**
 * StatusBadge pure presentation component.
 *
 * @example
 * ```tsx
 * <StatusBadgePure status="synced" />
 * <StatusBadgePure status="pending" />
 * ```
 */
export function StatusBadgePure({ status, className }: StatusBadgePureProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} dot={config.dot} className={className}>
      {config.label}
    </Badge>
  );
}
