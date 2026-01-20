/**
 * Authentication page.
 *
 * @description
 * Handles passkey registration and login.
 * Shows appropriate UI based on WebAuthn support and existing credentials.
 */

import { useEffect, useState } from "react";
import { useSelector, useStable } from "atomirx/react";
import { authStore } from "../../stores/auth.store";
import { AuthPagePure } from "./authPage.pure";

/**
 * Auth view types.
 */
export type AuthView = "checking" | "register" | "login" | "unsupported";

/**
 * Auth page logic hook return type.
 */
export interface UseAuthPageLogicReturn {
  /** Current view state */
  view: AuthView;
  /** Username input value */
  username: string;
  /** Whether user has stored credentials */
  hasCredentials: boolean;
  /** Whether passkey prompt is visible */
  showPasskeyPrompt: boolean;
  /** Whether an operation is loading */
  isLoading: boolean;
  /** Auth error if any */
  authError: { code: string; message: string } | null;
  /** Auth support info */
  authSupport: {
    webauthn: boolean;
    platformAuthenticator: boolean;
    prfExtension: boolean;
  } | null;
  /** Set username value */
  setUsername: (value: string) => void;
  /** Handle registration */
  onRegister: () => Promise<void>;
  /** Handle login */
  onLogin: () => Promise<void>;
  /** Switch to register view */
  onSwitchToRegister: () => void;
  /** Switch to login view */
  onSwitchToLogin: () => void;
}

/**
 * Auth page logic hook.
 *
 * @description
 * Manages state and handlers for the authentication page.
 * Handles view switching, form state, and auth operations.
 *
 * @businessRules
 * - Shows "checking" view while detecting WebAuthn support
 * - Shows "unsupported" if browser lacks WebAuthn/platform authenticator
 * - Shows "login" if user has existing credentials, otherwise "register"
 * - Passkey prompt appears during registration/login operations
 *
 * @stateFlow
 * checking → (no support) → unsupported
 * checking → (has credentials) → login
 * checking → (no credentials) → register
 * register ↔ login (user can switch)
 *
 * @returns Auth page state and handlers
 *
 * @example
 * ```tsx
 * const logic = useAuthPageLogic();
 * return <AuthPageUI {...logic} />;
 * ```
 */
export function useAuthPageLogic(): UseAuthPageLogicReturn {
  // 1. External stores
  const auth = authStore();

  // 2. Selectors
  const { authSupport, authError, isLoading } = useSelector(({ read }) => ({
    authSupport: read(auth.authSupport$),
    authError: read(auth.authError$),
    isLoading: read(auth.isLoading$),
  }));

  // 3. Local state
  const [view, setView] = useState<AuthView>("checking");
  const [username, setUsername] = useState("");
  const [hasCredentials, setHasCredentials] = useState(false);
  const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(false);

  // 4. Callbacks (useStable)
  const callbacks = useStable({
    onRegister: async () => {
      if (!username.trim()) return;
      setShowPasskeyPrompt(true);
      await auth.register(username.trim());
      setShowPasskeyPrompt(false);
    },
    onLogin: async () => {
      setShowPasskeyPrompt(true);
      await auth.login();
      setShowPasskeyPrompt(false);
    },
    onSwitchToRegister: () => {
      auth.clearError();
      setView("register");
    },
    onSwitchToLogin: () => {
      auth.clearError();
      setView("login");
    },
  });

  // 5. Effects (ALWAYS last)
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

  return {
    // State
    view,
    username,
    hasCredentials,
    showPasskeyPrompt,
    isLoading,
    authError,
    authSupport,
    // Setters
    setUsername,
    // Handlers
    ...callbacks,
  };
}

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
  const pureProps = useAuthPageLogic();
  return <AuthPagePure {...pureProps} />;
}
