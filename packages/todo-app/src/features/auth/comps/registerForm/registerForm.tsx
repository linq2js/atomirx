/**
 * Registration form component.
 *
 * @description
 * Form for creating a new passkey account.
 * Displays username input, PRF support status, and registration button.
 */

import { RegisterFormPure, type RegisterFormPureProps } from "./registerForm.pure";

/**
 * RegisterForm component props.
 */
export type RegisterFormProps = RegisterFormPureProps;

/**
 * RegisterForm logic hook.
 *
 * @description
 * Logic hook for RegisterForm. Since RegisterForm receives all state as props,
 * this hook simply passes through props.
 *
 * @param props - RegisterForm props
 * @returns Props for RegisterFormPure
 */
export function useRegisterFormLogic(props: RegisterFormProps): RegisterFormPureProps {
  return props;
}

/**
 * RegisterForm component.
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
export function RegisterForm(props: RegisterFormProps) {
  const pureProps = useRegisterFormLogic(props);
  return <RegisterFormPure {...pureProps} />;
}
