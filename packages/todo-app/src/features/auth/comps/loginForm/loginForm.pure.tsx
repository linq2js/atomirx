/**
 * LoginForm presentation component.
 *
 * @description
 * Pure presentation component for LoginForm.
 * Use this in Storybook to test all visual states.
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
 * LoginForm pure component props.
 */
export interface LoginFormPureProps {
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
 * LoginForm pure presentation component.
 *
 * @example
 * ```tsx
 * <LoginFormPure
 *   onSubmit={handleLogin}
 *   onSwitchToRegister={switchToRegister}
 *   isLoading={isLoading}
 *   error={authError}
 * />
 * ```
 */
export function LoginFormPure({
  onSubmit,
  onSwitchToRegister,
  isLoading,
  error,
}: LoginFormPureProps) {
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
