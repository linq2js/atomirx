/**
 * Login form component.
 *
 * @description
 * Form for signing in with an existing passkey.
 * Displays sign in button and link to create new account.
 *
 * @businessRules
 * - Submit button triggers passkey authentication flow
 * - Shows error message if login fails
 * - Provides link to switch to registration for new users
 * - Loading state prevents double submission
 *
 * @edgeCases
 * - Login error: Shows error message with details
 * - User cancels passkey prompt: Error handled by auth service
 */

import { Fingerprint, AlertCircle } from "lucide-react";
import { Button } from "@/ui";

/**
 * Login form props.
 */
export interface LoginFormProps {
  /** Callback when sign in is clicked */
  onSubmit: () => void;
  /** Callback to switch to register view */
  onSwitchToRegister: () => void;
  /** Whether form is in loading state */
  isLoading: boolean;
  /** Error from login attempt */
  error: { code: string; message: string } | null;
}

/**
 * Login form component.
 *
 * @example
 * ```tsx
 * <LoginForm
 *   onSubmit={handleLogin}
 *   onSwitchToRegister={switchToRegister}
 *   isLoading={isLoading}
 *   error={authError}
 * />
 * ```
 */
export function LoginForm({
  onSubmit,
  onSwitchToRegister,
  isLoading,
  error,
}: LoginFormProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Welcome Back
        </h2>
        <p className="text-sm text-gray-600">
          Sign in with your passkey to continue
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Sign in failed</p>
            <p className="text-sm text-red-600">{error.message}</p>
          </div>
        </div>
      )}

      <Button
        variant="primary"
        className="w-full"
        isLoading={isLoading}
        loadingText="Authenticating..."
        onClick={onSubmit}
        leftIcon={<Fingerprint className="h-5 w-5" />}
      >
        Sign in with Passkey
      </Button>

      <div className="text-center">
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Create a new account
        </button>
      </div>
    </div>
  );
}
