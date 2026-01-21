/**
 * Auth loading state component.
 *
 * @description
 * Displays a loading spinner while checking authentication support.
 * Shown during initial page load when determining WebAuthn capabilities.
 */

import { Loader2 } from "lucide-react";

/**
 * Auth loading state component.
 *
 * @example
 * ```tsx
 * if (view === "checking") return <AuthLoadingState />;
 * ```
 */
export function AuthLoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-gray-600">Checking authentication support...</p>
      </div>
    </div>
  );
}
