/**
 * AuthPage presentation component.
 *
 * @description
 * Pure presentation component for AuthPage.
 * Use this in Storybook to test all visual states.
 */

import { PasskeyPrompt } from "../../comps/passkeyPrompt";
import { RegisterForm } from "../../comps/registerForm";
import { LoginForm } from "../../comps/loginForm";
import { AuthLoadingState } from "./authPage.loading";
import { AuthUnsupportedState } from "./authPage.unsupported";
import { AuthLayout } from "./authLayout";
import type { AuthView } from "./authPage";

/**
 * AuthPage pure component props.
 */
export interface AuthPagePureProps {
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
 * AuthPage pure presentation component.
 *
 * @example
 * ```tsx
 * <AuthPagePure
 *   view="register"
 *   username=""
 *   hasCredentials={false}
 *   showPasskeyPrompt={false}
 *   isLoading={false}
 *   authError={null}
 *   authSupport={{ webauthn: true, platformAuthenticator: true, prfExtension: true }}
 *   setUsername={() => {}}
 *   onRegister={async () => {}}
 *   onLogin={async () => {}}
 *   onSwitchToRegister={() => {}}
 *   onSwitchToLogin={() => {}}
 * />
 * ```
 */
export function AuthPagePure({
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
}: AuthPagePureProps) {
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
