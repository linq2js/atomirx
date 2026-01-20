/**
 * Skeleton primitive component.
 *
 * @description
 * Base placeholder component for loading states.
 * This is a primitive component - for composed skeletons, see ui/composed.
 */

import { SkeletonPure, type SkeletonPureProps } from "./skeleton.pure";

/**
 * Skeleton component props.
 */
export type SkeletonProps = SkeletonPureProps;

/**
 * Skeleton logic hook.
 *
 * @description
 * Logic hook for Skeleton. Since Skeleton is a stateless primitive,
 * this hook simply passes through props.
 *
 * @param props - Skeleton props
 * @returns Props for SkeletonPure
 */
export function useSkeletonLogic(props: SkeletonProps): SkeletonPureProps {
  return props;
}

/**
 * Skeleton primitive component.
 *
 * @example
 * ```tsx
 * <Skeleton width={200} height={20} />
 * <Skeleton width={40} height={40} circle />
 * ```
 */
export function Skeleton(props: SkeletonProps) {
  const pureProps = useSkeletonLogic(props);
  return <SkeletonPure {...pureProps} />;
}
