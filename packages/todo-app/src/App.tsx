import { Suspense, useEffect, useState } from "react";
import { useSelector } from "atomirx/react";
import { ErrorBoundary } from "@/shared/components";
import { ToastProvider, ToastContainer } from "@/features/ui";
import { authStore, AuthPage } from "@/features/auth";
import { TodosPage } from "@/features/todos";
import { Loader2 } from "lucide-react";

/**
 * Root application component.
 * Handles global error boundary and suspense for async operations.
 *
 * @description
 * The app has two main states:
 * 1. Unauthenticated: Shows AuthPage for passkey registration/login
 * 2. Authenticated: Shows TodosPage with encrypted todos
 *
 * Authentication state is managed by authStore (atomirx).
 * Crypto key is derived from passkey PRF extension.
 * Session is persisted in sessionStorage for same-tab refresh persistence.
 */
export function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Suspense fallback={<LoadingScreen />}>
          <AppContent />
        </Suspense>
        <ToastContainer />
      </ToastProvider>
    </ErrorBoundary>
  );
}

/**
 * Main app content.
 * Shows AuthPage or TodosPage based on authentication state.
 * Attempts to restore session from sessionStorage on mount.
 */
function AppContent() {
  const auth = authStore();
  const isAuthenticated = useSelector(auth.isAuthenticated$);
  const [isRestoring, setIsRestoring] = useState(true);

  // Try to restore session from sessionStorage on mount
  useEffect(() => {
    async function tryRestoreSession() {
      try {
        await auth.restoreSession();
      } finally {
        setIsRestoring(false);
      }
    }
    tryRestoreSession();
  }, [auth]);

  // Show loading while restoring session
  if (isRestoring) {
    return <LoadingScreen />;
  }

  return isAuthenticated ? <TodosPage /> : <AuthPage />;
}

/**
 * Full-screen loading indicator.
 * Shown during initial app load and lazy component loading.
 */
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  );
}
