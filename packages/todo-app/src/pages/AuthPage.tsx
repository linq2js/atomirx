/**
 * Authentication page.
 *
 * @description
 * Handles passkey registration and login.
 * Shows appropriate UI based on WebAuthn support and existing credentials.
 */

import { useEffect, useState, useCallback } from "react";
import { useSelector } from "atomirx/react";
import { Fingerprint, KeyRound, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { authModule } from "@/state";
import { Button, Input } from "@/components/ui";
import { PasskeyPrompt } from "@/components/auth/PasskeyPrompt";
import { cn } from "@/lib/utils";

/**
 * Auth page view state.
 */
type AuthView = "checking" | "register" | "login" | "unsupported";

/**
 * Authentication page component.
 *
 * @example
 * ```tsx
 * function App() {
 *   const isAuthenticated = useSelector(auth.isAuthenticated$);
 *   return isAuthenticated ? <TodosPage /> : <AuthPage />;
 * }
 * ```
 */
export function AuthPage() {
  const auth = authModule();
  const authSupport = useSelector(auth.authSupport$);
  const authError = useSelector(auth.authError$);
  const isLoading = useSelector(auth.isLoading$);

  const [view, setView] = useState<AuthView>("checking");
  const [username, setUsername] = useState("");
  const [hasCredentials, setHasCredentials] = useState(false);
  const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(false);

  // Check support and credentials on mount
  useEffect(() => {
    async function initialize() {
      const support = await auth.checkSupport();

      if (!support.webauthn || !support.platformAuthenticator) {
        setView("unsupported");
        return;
      }

      const hasExisting = await auth.hasStoredCredentials();
      setHasCredentials(hasExisting);
      setView(hasExisting ? "login" : "register");
    }

    initialize();
  }, [auth]);

  /**
   * Handle registration.
   */
  const handleRegister = useCallback(async () => {
    if (!username.trim()) return;

    setShowPasskeyPrompt(true);
    const result = await auth.register(username.trim());
    setShowPasskeyPrompt(false);

    if (result.success) {
      // Registration successful - app will redirect to todos
    }
  }, [auth, username]);

  /**
   * Handle login.
   */
  const handleLogin = useCallback(async () => {
    setShowPasskeyPrompt(true);
    const result = await auth.login();
    setShowPasskeyPrompt(false);

    if (result.success) {
      // Login successful - app will redirect to todos
    }
  }, [auth]);

  /**
   * Switch to register view.
   */
  const switchToRegister = useCallback(() => {
    auth.clearError();
    setView("register");
  }, [auth]);

  /**
   * Switch to login view.
   */
  const switchToLogin = useCallback(() => {
    auth.clearError();
    setView("login");
  }, [auth]);

  // Loading state
  if (view === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Checking authentication support...</p>
        </div>
      </div>
    );
  }

  // Unsupported browser
  if (view === "unsupported") {
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
            your current browser. Please use a modern browser like Chrome, Safari,
            or Edge.
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Secure Todo</h1>
          <p className="mt-2 text-gray-600">
            Your todos, encrypted with passkeys
          </p>
        </div>

        {/* Auth card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {view === "register" ? (
            <RegisterForm
              username={username}
              onUsernameChange={setUsername}
              onSubmit={handleRegister}
              onSwitchToLogin={hasCredentials ? switchToLogin : undefined}
              isLoading={isLoading}
              error={authError}
              prfSupported={authSupport?.prfExtension ?? false}
            />
          ) : (
            <LoginForm
              onSubmit={handleLogin}
              onSwitchToRegister={switchToRegister}
              isLoading={isLoading}
              error={authError}
            />
          )}
        </div>

        {/* Security info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p className="flex items-center justify-center gap-2">
            <KeyRound className="h-4 w-4" />
            Secured with end-to-end encryption
          </p>
        </div>
      </div>

      {/* Passkey prompt overlay */}
      {showPasskeyPrompt && <PasskeyPrompt />}
    </div>
  );
}

/**
 * Registration form props.
 */
interface RegisterFormProps {
  username: string;
  onUsernameChange: (value: string) => void;
  onSubmit: () => void;
  onSwitchToLogin?: () => void;
  isLoading: boolean;
  error: { code: string; message: string } | null;
  prfSupported: boolean;
}

/**
 * Registration form component.
 */
function RegisterForm({
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

      <Input
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

/**
 * Login form props.
 */
interface LoginFormProps {
  onSubmit: () => void;
  onSwitchToRegister: () => void;
  isLoading: boolean;
  error: { code: string; message: string } | null;
}

/**
 * Login form component.
 */
function LoginForm({
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
