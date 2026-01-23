/**
 * Auth unsupported browser state component.
 *
 * @description
 * Displays an error message when the browser doesn't support
 * WebAuthn or platform authenticator (Touch ID, Face ID, etc.).
 */

import { AlertCircle } from "lucide-react";

/**
 * Auth unsupported state component.
 *
 * @example
 * ```tsx
 * if (view === "unsupported") return <AuthUnsupportedState />;
 * ```
 */
export function AuthUnsupportedState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Browser Not Supported
        </h1>
        <p className="text-gray-600 mb-6">
          This app requires passkey authentication, which is not supported in
          your current browser. Please use a modern browser like Chrome,
          Safari, or Edge.
        </p>
        <div className="text-sm text-gray-500">
          <p>Requirements:</p>
          <ul className="mt-2 space-y-1">
            <li>• WebAuthn API support</li>
            <li>• Platform authenticator (Touch ID, Face ID, etc.)</li>
            <li>• Secure context (HTTPS or localhost)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
