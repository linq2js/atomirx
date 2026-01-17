interface StatusBadgeProps {
  status: "idle" | "loading" | "success" | "error" | "stale";
}

const statusConfig = {
  idle: { label: "Idle", className: "badge bg-surface-700 text-surface-300" },
  loading: { label: "Loading", className: "badge-warning" },
  success: { label: "Success", className: "badge-success" },
  error: { label: "Error", className: "badge-error" },
  stale: { label: "Stale", className: "badge-warning" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return <span className={config.className}>{config.label}</span>;
}
