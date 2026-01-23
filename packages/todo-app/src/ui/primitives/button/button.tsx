/**
 * Button component with variants.
 *
 * @description
 * A styled button component using Base UI with Tailwind CSS.
 * Supports multiple variants, sizes, and loading state.
 */

import { forwardRef } from "react";
import { ButtonPure, type ButtonPureProps } from "./button.pure";

/**
 * Button component props.
 */
export type ButtonProps = ButtonPureProps;

/**
 * Button logic hook.
 *
 * @description
 * Logic hook for Button. Since Button is a stateless primitive,
 * this hook simply passes through props.
 *
 * @param props - Button props
 * @returns Props for ButtonPure
 */
export function useButtonLogic(props: ButtonProps): ButtonPureProps {
  return props;
}

/**
 * Button component.
 *
 * @example
 * ```tsx
 * <Button variant="primary" onClick={handleClick}>
 *   Click me
 * </Button>
 *
 * <Button variant="secondary" size="sm" isLoading>
 *   Saving...
 * </Button>
 *
 * <Button leftIcon={<Plus />} variant="ghost">
 *   Add Item
 * </Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(props, ref) {
    const pureProps = useButtonLogic(props);
    return <ButtonPure ref={ref} {...pureProps} />;
  }
);
