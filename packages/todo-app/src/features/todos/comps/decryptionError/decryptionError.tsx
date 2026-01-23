/**
 * Decryption error alert component.
 *
 * @description
 * Displays an error message when todo decryption fails.
 * Prompts user to sign out and re-authenticate.
 */

import { DecryptionErrorPure, type DecryptionErrorPureProps } from "./decryptionError.pure";

/**
 * DecryptionError component props.
 */
export type DecryptionErrorProps = DecryptionErrorPureProps;

/**
 * DecryptionError logic hook.
 *
 * @param props - DecryptionError props
 * @returns Props for DecryptionErrorPure
 */
export function useDecryptionErrorLogic(props: DecryptionErrorProps): DecryptionErrorPureProps {
  return props;
}

/**
 * DecryptionError component.
 *
 * @example
 * ```tsx
 * {isDecryptionError && (
 *   <DecryptionError onLogout={handleLogout} />
 * )}
 * ```
 */
export function DecryptionError(props: DecryptionErrorProps) {
  const pureProps = useDecryptionErrorLogic(props);
  return <DecryptionErrorPure {...pureProps} />;
}
