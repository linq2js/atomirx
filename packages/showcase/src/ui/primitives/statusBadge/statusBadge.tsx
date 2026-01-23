/**
 * Status badge component for displaying state indicators.
 *
 * @description A simple, prop-driven badge component that displays
 * status labels with appropriate color styling.
 */

export interface StatusBadgeProps {
  /** The status to display */
  status: "idle" | "loading" | "success" | "error" | "stale";
}

const statusConfig = {
  idle: { label: "Idle", className: "badge bg-surface-700 text-surface-300" },
  loading: { label: "Loading", className: "badge-warning" },
  success: { label: "Success", className: "badge-success" },
  error: { label: "Error", className: "badge-error" },
  stale: { label: "Stale", className: "badge-warning" },
};

/**
 * Displays a status badge with appropriate styling.
 *
 * @param props - Component props
 * @param props.status - The status type to display
 * @returns A styled span element with the status label
 *
 * @example
 * <StatusBadge status="loading" />
 * <StatusBadge status="success" />
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return <span className={config.className}>{config.label}</span>;
}
