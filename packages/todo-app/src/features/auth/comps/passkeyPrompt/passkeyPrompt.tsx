/**
 * Passkey prompt overlay.
 *
 * @description
 * Shows a visual prompt when waiting for passkey authentication.
 * Helps users understand they need to interact with their authenticator.
 */

import {
  PasskeyPromptPure,
  PasskeyErrorPure,
  type PasskeyErrorPureProps,
} from "./passkeyPrompt.pure";

/**
 * PasskeyPrompt component.
 *
 * @example
 * ```tsx
 * {isAuthenticating && <PasskeyPrompt />}
 * ```
 */
export function PasskeyPrompt() {
  return <PasskeyPromptPure />;
}

/**
 * PasskeyError props.
 */
export type PasskeyErrorProps = PasskeyErrorPureProps;

/**
 * PasskeyError logic hook.
 *
 * @description
 * Logic hook for PasskeyError. Since PasskeyError receives all state as props,
 * this hook simply passes through props.
 *
 * @param props - PasskeyError props
 * @returns Props for PasskeyErrorPure
 */
export function usePasskeyErrorLogic(props: PasskeyErrorProps): PasskeyErrorPureProps {
  return props;
}

/**
 * PasskeyError component.
 *
 * @example
 * ```tsx
 * {authError && (
 *   <PasskeyError
 *     code={authError.code}
 *     message={authError.message}
 *     onRetry={handleRetry}
 *   />
 * )}
 * ```
 */
export function PasskeyError(props: PasskeyErrorProps) {
  const pureProps = usePasskeyErrorLogic(props);
  return <PasskeyErrorPure {...pureProps} />;
}
