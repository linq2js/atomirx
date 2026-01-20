/**
 * Authentication page.
 *
 * @description
 * Handles passkey registration and login.
 * Shows appropriate UI based on WebAuthn support and existing credentials.
 */

import { useEffect, useState, useCallback } from "react";
import { useSelector } from "atomirx/react";
import { authStore } from "../stores";
import { PasskeyPrompt, RegisterForm, LoginForm } from "../comps";
import { AuthLoadingState } from "./AuthLoadingState";
import { AuthUnsupportedState } from "./AuthUnsupportedState";
import { AuthLayout } from "./AuthLayout";

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
  const auth = authStore();
  const { authSupport, authError, isLoading } = useSelector(({ read }) => ({
    authSupport: read(auth.authSupport$),
    authError: read(auth.authError$),
    isLoading: read(auth.isLoading$),
  }));

  const [view, setView] = useState<AuthView>("checking");
  const [username, setUsername] = useState("");
  const [hasCredentials, setHasCredentials] = useState(false);
  const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(false);

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

  const handleRegister = useCallback(async () => {
    if (!username.trim()) return;
    setShowPasskeyPrompt(true);
    await auth.register(username.trim());
    setShowPasskeyPrompt(false);
  }, [auth, username]);

  const handleLogin = useCallback(async () => {
    setShowPasskeyPrompt(true);
    await auth.login();
    setShowPasskeyPrompt(false);
  }, [auth]);

  const switchToRegister = useCallback(() => {
    auth.clearError();
    setView("register");
  }, [auth]);

  const switchToLogin = useCallback(() => {
    auth.clearError();
    setView("login");
  }, [auth]);

  if (view === "checking") return <AuthLoadingState />;
  if (view === "unsupported") return <AuthUnsupportedState />;

  return (
    <>
      <AuthLayout>
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
      </AuthLayout>
      {showPasskeyPrompt && <PasskeyPrompt />}
    </>
  );
}
