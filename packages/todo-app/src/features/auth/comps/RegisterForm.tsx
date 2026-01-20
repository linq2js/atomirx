/**
 * Registration form component.
 *
 * @description
 * Form for creating a new passkey account.
 * Displays username input, PRF support status, and registration button.
 *
 * @businessRules
 * - Username is required and cannot be empty/whitespace
 * - Submit button is disabled while loading or username is empty
 * - Shows PRF extension support status for user awareness
 * - Displays error message if registration fails
 * - Provides link to switch to login if user has existing credentials
 *
 * @edgeCases
 * - Empty username: Submit button disabled
 * - Registration error: Shows error message with details
 * - PRF not supported: Shows warning about basic encryption
 */

import { Fingerprint, AlertCircle, ShieldCheck } from "lucide-react";
import { Button, InputField } from "@/ui";
import { cn } from "@/shared/utils";

/**
 * Registration form props.
 */
export interface RegisterFormProps {
  /** Current username value */
  username: string;
  /** Callback when username changes */
  onUsernameChange: (value: string) => void;
  /** Callback when form is submitted */
  onSubmit: () => void;
  /** Callback to switch to login view (undefined if no stored credentials) */
  onSwitchToLogin?: () => void;
  /** Whether form is in loading state */
  isLoading: boolean;
  /** Error from registration attempt */
  error: { code: string; message: string } | null;
  /** Whether PRF extension is supported */
  prfSupported: boolean;
}

/**
 * Registration form component.
 *
 * @example
 * ```tsx
 * <RegisterForm
 *   username={username}
 *   onUsernameChange={setUsername}
 *   onSubmit={handleRegister}
 *   isLoading={isLoading}
 *   error={authError}
 *   prfSupported={authSupport?.prfExtension ?? false}
 * />
 * ```
 */
export function RegisterForm({
  username,
  onUsernameChange,
  onSubmit,
  onSwitchToLogin,
  isLoading,
  error,
  prfSupported,
}: RegisterFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Create Account
        </h2>
        <p className="text-sm text-gray-600">
          Set up a passkey to secure your todos
        </p>
      </div>

      <InputField
        type="text"
        placeholder="Enter your name"
        value={username}
        onChange={(e) => onUsernameChange(e.target.value)}
        disabled={isLoading}
        autoComplete="username"
        leftIcon={<Fingerprint className="h-4 w-4" />}
      />

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">
              Registration failed
            </p>
            <p className="text-sm text-red-600">{error.message}</p>
          </div>
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        isLoading={isLoading}
        loadingText="Creating passkey..."
        disabled={!username.trim()}
        leftIcon={<Fingerprint className="h-5 w-5" />}
      >
        Create Passkey
      </Button>

      {/* PRF status */}
      <div
        className={cn(
          "flex items-center gap-2 p-3 rounded-lg text-sm",
          prfSupported
            ? "bg-green-50 text-green-800"
            : "bg-yellow-50 text-yellow-800"
        )}
      >
        <ShieldCheck className="h-4 w-4 shrink-0" />
        <span>
          {prfSupported
            ? "Full encryption support available"
            : "Basic encryption (PRF not supported)"}
        </span>
      </div>

      {onSwitchToLogin && (
        <div className="text-center">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Already have an account? Sign in
          </button>
        </div>
      )}
    </form>
  );
}
