/**
 * Passkey prompt overlay.
 *
 * @description
 * Shows a visual prompt when waiting for passkey authentication.
 * Helps users understand they need to interact with their authenticator.
 *
 * @businessRules
 * - Shows animated fingerprint icon to indicate biometric action required
 * - Displays platform-specific hints (Touch ID, Windows Hello, etc.)
 * - Must be visible during WebAuthn ceremony to guide user
 * - Covers entire screen with semi-transparent backdrop
 *
 * @edgeCases
 * - If authenticator doesn't respond: parent handles timeout via auth service
 * - If user cancels: parent handles NOT_ALLOWED error
 */

import { Fingerprint } from "lucide-react";

/**
 * Passkey prompt component.
 *
 * @example
 * ```tsx
 * {isAuthenticating && <PasskeyPrompt />}
 * ```
 */
export function PasskeyPrompt() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Animated fingerprint icon */}
        <div className="relative mx-auto w-20 h-20 mb-6">
          <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75" />
          <div className="relative w-full h-full bg-blue-600 rounded-full flex items-center justify-center">
            <Fingerprint className="h-10 w-10 text-white" />
          </div>
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Verify Your Identity
        </h3>

        <p className="text-gray-600 mb-6">
          Use your fingerprint, face, or device PIN to continue
        </p>

        {/* Platform-specific hints */}
        <div className="text-sm text-gray-500 space-y-1">
          <p className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Touch ID / Face ID on Mac
          </p>
          <p className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Windows Hello on PC
          </p>
          <p className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Biometrics on mobile
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Passkey error display props.
 */
export interface PasskeyErrorProps {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Retry callback */
  onRetry?: () => void;
  /** Cancel callback */
  onCancel?: () => void;
}

/**
 * Get user-friendly error message.
 *
 * @businessRules
 * - NOT_ALLOWED: User cancelled → show "Authentication Cancelled"
 * - TIMEOUT: Took too long → show "Verification Timed Out"
 * - NOT_SUPPORTED: Browser can't do passkeys → show "Passkeys Not Supported"
 * - INVALID_STATE: Something wrong → show "Invalid State" with refresh hint
 * - SECURITY_ERROR: HTTPS required → show "Security Error"
 * - Default: Generic error message
 */
function getErrorMessage(code: string): { title: string; description: string } {
  switch (code) {
    case "NOT_ALLOWED":
      return {
        title: "Authentication Cancelled",
        description: "You cancelled the passkey verification. Please try again.",
      };
    case "TIMEOUT":
      return {
        title: "Verification Timed Out",
        description:
          "The passkey verification took too long. Please try again.",
      };
    case "NOT_SUPPORTED":
      return {
        title: "Passkeys Not Supported",
        description:
          "Your browser or device doesn't support passkey authentication.",
      };
    case "INVALID_STATE":
      return {
        title: "Invalid State",
        description:
          "The passkey operation couldn't be completed. Please refresh and try again.",
      };
    case "SECURITY_ERROR":
      return {
        title: "Security Error",
        description:
          "The operation was blocked for security reasons. Make sure you're using HTTPS.",
      };
    default:
      return {
        title: "Authentication Error",
        description: "An unexpected error occurred. Please try again.",
      };
  }
}

/**
 * Passkey error display component.
 *
 * @businessRules
 * - Shows user-friendly error title and description based on error code
 * - For NOT_ALLOWED errors, hides technical details (user knows they cancelled)
 * - Provides retry and cancel actions when callbacks are provided
 * - Uses red color scheme to indicate error state
 *
 * @example
 * ```tsx
 * {authError && (
 *   <PasskeyError
 *     code={authError.code}
 *     message={authError.message}
 *     onRetry={handleRetry}
 *   />
 * )}
 * ```
 */
export function PasskeyError({
  code,
  message,
  onRetry,
  onCancel,
}: PasskeyErrorProps) {
  const { title, description } = getErrorMessage(code);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <Fingerprint className="h-8 w-8 text-red-600" />
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>

        <p className="text-gray-600 mb-2">{description}</p>

        {message && code !== "NOT_ALLOWED" && (
          <p className="text-sm text-gray-500 mb-6">Details: {message}</p>
        )}

        <div className="flex gap-3 justify-center">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
