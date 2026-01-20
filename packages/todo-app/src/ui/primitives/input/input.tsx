/**
 * Input primitive component.
 *
 * @description
 * A pure input element using Base UI with Tailwind CSS.
 * This is a primitive component - for input with label/error, use InputField.
 */

import { forwardRef } from "react";
import { InputPure, type InputPureProps } from "./input.pure";

/**
 * Input component props.
 */
export type InputProps = InputPureProps;

/**
 * Input logic hook.
 *
 * @description
 * Logic hook for Input. Since Input is a stateless primitive,
 * this hook simply passes through props.
 *
 * @param props - Input props
 * @returns Props for InputPure
 */
export function useInputLogic(props: InputProps): InputPureProps {
  return props;
}

/**
 * Input primitive component.
 *
 * @example
 * ```tsx
 * <Input placeholder="Enter text" />
 *
 * <Input type="email" isInvalid />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(props, ref) {
    const pureProps = useInputLogic(props);
    return <InputPure ref={ref} {...pureProps} />;
  }
);
