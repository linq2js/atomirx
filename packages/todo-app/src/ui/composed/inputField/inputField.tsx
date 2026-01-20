/**
 * InputField composed component.
 *
 * @description
 * A complete input field with label, input, and error message.
 * Composes primitives: Input.
 */

import { forwardRef } from "react";
import { InputFieldPure, type InputFieldPureProps } from "./inputField.pure";

/**
 * InputField component props.
 */
export type InputFieldProps = InputFieldPureProps;

/**
 * InputField logic hook.
 *
 * @description
 * Logic hook for InputField. Since InputField is stateless,
 * this hook simply passes through props.
 *
 * @param props - InputField props
 * @returns Props for InputFieldPure
 */
export function useInputFieldLogic(props: InputFieldProps): InputFieldPureProps {
  return props;
}

/**
 * InputField composed component.
 *
 * @example
 * ```tsx
 * <InputField
 *   label="Email"
 *   placeholder="Enter your email"
 *   type="email"
 * />
 *
 * <InputField
 *   label="Search"
 *   leftIcon={<Search className="h-4 w-4" />}
 * />
 *
 * <InputField
 *   label="Password"
 *   error="Password is required"
 * />
 * ```
 */
export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  function InputField(props, ref) {
    const pureProps = useInputFieldLogic(props);
    return <InputFieldPure ref={ref} {...pureProps} />;
  }
);
