/**
 * Toast notification component.
 *
 * @description
 * A simple toast notification system using context and Base UI.
 * Supports multiple toast types and auto-dismiss.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
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
 * Toast context type.
 */
interface ToastContextType {
  /** Active toasts */
  toasts: Toast[];
  /** Add a toast */
  addToast: (toast: Omit<Toast, "id">) => string;
  /** Remove a toast */
  removeToast: (id: string) => void;
  /** Clear all toasts */
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

/**
 * Hook to use toast functionality.
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

/**
 * Toast provider props.
 */
interface ToastProviderProps {
  children: ReactNode;
  /** Default duration for toasts (ms) */
  defaultDuration?: number;
  /** Maximum number of toasts to show */
  maxToasts?: number;
}

/**
 * Toast provider component.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <ToastProvider>
 *       <YourApp />
 *       <ToastContainer />
 *     </ToastProvider>
 *   );
 * }
 *
 * function Component() {
 *   const { addToast } = useToast();
 *
 *   const handleSuccess = () => {
 *     addToast({
 *       type: "success",
 *       title: "Success!",
 *       message: "Your changes have been saved.",
 *     });
 *   };
 * }
 * ```
 */
export function ToastProvider({
  children,
  defaultDuration = 5000,
  maxToasts = 5,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = crypto.randomUUID();
      const duration = toast.duration ?? defaultDuration;

      setToasts((prev) => {
        const newToasts = [...prev, { ...toast, id, duration }];
        // Limit number of toasts
        if (newToasts.length > maxToasts) {
          return newToasts.slice(-maxToasts);
        }
        return newToasts;
      });

      // Auto-dismiss
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }

      return id;
    },
    [defaultDuration, maxToasts, removeToast]
  );

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
    </ToastContext.Provider>
  );
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
 * Single toast component.
 */
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
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
        {toast.title && (
          <p className="font-medium">{toast.title}</p>
        )}
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
 * Toast container component.
 * Place this at the root of your app to display toasts.
 */
export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
