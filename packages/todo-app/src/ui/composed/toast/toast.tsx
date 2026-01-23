/**
 * Toast notification composed component.
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
import {
  ToastContainerPure,
  type Toast,
  type ToastType,
} from "./toast.pure";

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
 * Toast container component.
 * Place this at the root of your app to display toasts.
 */
export function ToastContainer() {
  const { toasts, removeToast } = useToast();
  return <ToastContainerPure toasts={toasts} onRemoveToast={removeToast} />;
}

// Re-export types
export type { Toast, ToastType };
