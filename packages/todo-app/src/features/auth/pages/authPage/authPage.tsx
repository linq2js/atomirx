/**
 * Authentication page.
 *
 * @description
 * Handles passkey registration and login.
 * Shows appropriate UI based on WebAuthn support and existing credentials.
 */

import { PasskeyPrompt } from "../../comps/passkeyPrompt";
import { RegisterForm } from "../../comps/registerForm";
import { LoginForm } from "../../comps/loginForm";
import { AuthLoadingState } from "./authLoadingState";
import { AuthUnsupportedState } from "./authUnsupportedState";
import { AuthLayout } from "./authLayout";
import { useAuthPageLogic } from "./authPage.logic";

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
  const {
    view,
    username,
    hasCredentials,
    showPasskeyPrompt,
    isLoading,
    authError,
    authSupport,
    setUsername,
    onRegister,
    onLogin,
    onSwitchToRegister,
    onSwitchToLogin,
  } = useAuthPageLogic();

  if (view === "checking") return <AuthLoadingState />;
  if (view === "unsupported") return <AuthUnsupportedState />;

  return (
    <>
      <AuthLayout>
        {view === "register" ? (
          <RegisterForm
            username={username}
            onUsernameChange={setUsername}
            onSubmit={onRegister}
            onSwitchToLogin={hasCredentials ? onSwitchToLogin : undefined}
            isLoading={isLoading}
            error={authError}
            prfSupported={authSupport?.prfExtension ?? false}
          />
        ) : (
          <LoginForm
            onSubmit={onLogin}
            onSwitchToRegister={onSwitchToRegister}
            isLoading={isLoading}
            error={authError}
          />
        )}
      </AuthLayout>
      {showPasskeyPrompt && <PasskeyPrompt />}
    </>
  );
}
