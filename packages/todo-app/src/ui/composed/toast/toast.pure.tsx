/**
 * Toast presentation components.
 *
 * @description
 * Pure presentation components for Toast.
 * Use these in Storybook to test all visual states.
 */

import { AlertCircle, CheckCircle, Info, X, AlertTriangle } from "lucide-react";
import { cn } from "@/shared/utils";

/**
 * Toast types.
 */
export type ToastType = "success" | "error" | "warning" | "info";

/**
 * Toast data.
 */
export interface Toast {
  /** Unique ID */
  id: string;
  /** Toast type */
  type: ToastType;
  /** Toast message */
  message: string;
  /** Optional title */
  title?: string;
  /** Auto-dismiss duration in ms (0 to disable) */
  duration?: number;
}

/**
 * ToastItem pure component props.
 */
export interface ToastItemPureProps {
  /** Toast data */
  toast: Toast;
  /** Handler to dismiss the toast */
  onDismiss: () => void;
}

/**
 * Toast icon by type.
 */
const toastIcons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

/**
 * Toast styles by type.
 */
const toastStyles: Record<ToastType, string> = {
  success: "bg-green-50 border-green-200 text-green-800",
  error: "bg-red-50 border-red-200 text-red-800",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
};

const toastIconStyles: Record<ToastType, string> = {
  success: "text-green-500",
  error: "text-red-500",
  warning: "text-yellow-500",
  info: "text-blue-500",
};

/**
 * Single toast item presentation component.
 *
 * @example
 * ```tsx
 * <ToastItemPure
 *   toast={{ id: "1", type: "success", message: "Saved!" }}
 *   onDismiss={() => {}}
 * />
 * ```
 */
export function ToastItemPure({ toast, onDismiss }: ToastItemPureProps) {
  const Icon = toastIcons[toast.type];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4 shadow-lg",
        "animate-in slide-in-from-right-full fade-in",
        toastStyles[toast.type]
      )}
      role="alert"
    >
      <Icon className={cn("h-5 w-5 shrink-0", toastIconStyles[toast.type])} />
      <div className="flex-1 min-w-0">
        {toast.title && <p className="font-medium">{toast.title}</p>}
        <p className={cn("text-sm", toast.title && "mt-1 opacity-90")}>
          {toast.message}
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 rounded p-1 hover:bg-black/5 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * ToastContainer pure component props.
 */
export interface ToastContainerPureProps {
  /** List of toasts to display */
  toasts: Toast[];
  /** Handler to remove a toast by ID */
  onRemoveToast: (id: string) => void;
}

/**
 * Toast container presentation component.
 *
 * @example
 * ```tsx
 * <ToastContainerPure
 *   toasts={[{ id: "1", type: "success", message: "Saved!" }]}
 *   onRemoveToast={(id) => removeToast(id)}
 * />
 * ```
 */
export function ToastContainerPure({ toasts, onRemoveToast }: ToastContainerPureProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastItemPure
          key={toast.id}
          toast={toast}
          onDismiss={() => onRemoveToast(toast.id)}
        />
      ))}
    </div>
  );
}
