/**
 * Todos page header component.
 *
 * @description
 * Header with app logo, user info, network status, and sync button.
 */

import { useSelector } from "atomirx/react";
import { authStore } from "@/features/auth/stores/auth.store";
import { networkStore } from "@/features/network/stores/network.store";
import { TodosHeaderPure, type TodosHeaderPureProps } from "./todosHeader.pure";

/**
 * Todos header props.
 */
export interface TodosHeaderProps {
  /** Callback when logout is clicked */
  onLogout: () => void;
  /** Callback when sync is triggered */
  onSync: () => Promise<void>;
}

/**
 * TodosHeader logic hook return type.
 */
export type UseTodosHeaderLogicReturn = TodosHeaderPureProps;

/**
 * TodosHeader logic hook.
 *
 * @description
 * Connects header to auth and network stores.
 *
 * @param props - Header props
 * @returns Header state and handlers
 */
export function useTodosHeaderLogic({
  onLogout,
  onSync,
}: TodosHeaderProps): UseTodosHeaderLogicReturn {
  const auth = authStore();
  const network = networkStore();

  const { user, isOnline } = useSelector(({ read }) => ({
    user: read(auth.user$),
    isOnline: read(network.isOnline$),
  }));

  return {
    username: user?.username,
    isOnline,
    onLogout,
    onSync,
  };
}

/**
 * Todos page header component.
 *
 * @example
 * ```tsx
 * <TodosHeader onLogout={handleLogout} onSync={handleSync} />
 * ```
 */
export function TodosHeader(props: TodosHeaderProps) {
  const pureProps = useTodosHeaderLogic(props);
  return <TodosHeaderPure {...pureProps} />;
}
