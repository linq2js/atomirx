/**
 * SkeletonText composed component.
 *
 * @description
 * Text placeholder for loading states.
 * Composes primitives: Skeleton.
 */

import { SkeletonTextPure, type SkeletonTextPureProps } from "./skeletonText.pure";

/**
 * SkeletonText component props.
 */
export type SkeletonTextProps = SkeletonTextPureProps;

/**
 * SkeletonText logic hook.
 *
 * @description
 * Logic hook for SkeletonText. Since SkeletonText is stateless,
 * this hook simply passes through props.
 *
 * @param props - SkeletonText props
 * @returns Props for SkeletonTextPure
 */
export function useSkeletonTextLogic(props: SkeletonTextProps): SkeletonTextPureProps {
  return props;
}

/**
 * SkeletonText composed component.
 *
 * @example
 * ```tsx
 * <SkeletonText lines={3} lastLineWidth="60%" />
 * ```
 */
export function SkeletonText(props: SkeletonTextProps) {
  const pureProps = useSkeletonTextLogic(props);
  return <SkeletonTextPure {...pureProps} />;
}
