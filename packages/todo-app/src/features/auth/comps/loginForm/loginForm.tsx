/**
 * Login form component.
 *
 * @description
 * Form for signing in with an existing passkey.
 * Displays sign in button and link to create new account.
 */

import { LoginFormPure, type LoginFormPureProps } from "./loginForm.pure";

/**
 * LoginForm component props.
 */
export type LoginFormProps = LoginFormPureProps;

/**
 * LoginForm logic hook.
 *
 * @description
 * Logic hook for LoginForm. Since LoginForm receives all state as props,
 * this hook simply passes through props.
 *
 * @param props - LoginForm props
 * @returns Props for LoginFormPure
 */
export function useLoginFormLogic(props: LoginFormProps): LoginFormPureProps {
  return props;
}

/**
 * LoginForm component.
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
export function LoginForm(props: LoginFormProps) {
  const pureProps = useLoginFormLogic(props);
  return <LoginFormPure {...pureProps} />;
}
