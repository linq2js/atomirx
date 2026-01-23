/**
 * SkeletonTodoItem domain component.
 *
 * @description
 * Skeleton placeholder for todo items during loading.
 * This is a domain component because it mirrors the TodoItem layout.
 */

import {
  SkeletonTodoItemPure,
  SkeletonTodoListPure,
  type SkeletonTodoItemPureProps,
  type SkeletonTodoListPureProps,
} from "./skeletonTodoItem.pure";

/**
 * SkeletonTodoItem component props.
 */
export type SkeletonTodoItemProps = SkeletonTodoItemPureProps;

/**
 * SkeletonTodoList component props.
 */
export type SkeletonTodoListProps = SkeletonTodoListPureProps;

/**
 * SkeletonTodoItem domain component.
 *
 * @example
 * ```tsx
 * <SkeletonTodoItem />
 * ```
 */
export function SkeletonTodoItem(props: SkeletonTodoItemProps) {
  return <SkeletonTodoItemPure {...props} />;
}

/**
 * SkeletonTodoList domain component.
 *
 * @example
 * ```tsx
 * <SkeletonTodoList count={5} />
 * ```
 */
export function SkeletonTodoList(props: SkeletonTodoListProps) {
  return <SkeletonTodoListPure {...props} />;
}
