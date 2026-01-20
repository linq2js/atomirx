/**
 * StatusBadge domain component.
 *
 * @description
 * Pre-configured badges for sync statuses.
 * This is a domain component because it knows about sync status business logic.
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
 * Status badge component props.
 */
export interface StatusBadgeProps {
  /** Sync status */
  status: "synced" | "pending" | "syncing" | "error" | "offline";
  /** Additional class names */
  className?: string;
}

const statusConfig: Record<
  StatusBadgeProps["status"],
  { variant: BadgeVariant; label: string; dot: boolean }
> = {
  synced: { variant: "success", label: "Synced", dot: true },
  pending: { variant: "warning", label: "Pending", dot: true },
  syncing: { variant: "info", label: "Syncing...", dot: true },
  error: { variant: "error", label: "Error", dot: true },
  offline: { variant: "secondary", label: "Offline", dot: true },
};

/**
 * StatusBadge domain component.
 *
 * @example
 * ```tsx
 * <StatusBadge status="synced" />
 * <StatusBadge status="pending" />
 * <StatusBadge status="offline" />
 * ```
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} dot={config.dot} className={className}>
      {config.label}
    </Badge>
  );
}
