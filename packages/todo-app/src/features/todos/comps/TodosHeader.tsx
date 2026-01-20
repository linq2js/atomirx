/**
 * Todos page header component.
 *
 * @description
 * Header with app logo, user info, network status, and sync button.
 *
 * @businessRules
 * - Shows current user's username
 * - Displays online/offline network status
 * - Provides logout and sync actions
 */

import { useSelector } from "atomirx/react";
import { LogOut, Wifi, WifiOff, ListTodo } from "lucide-react";
import { authStore } from "@/features/auth";
import { networkStore } from "@/features/network";
import { Button } from "@/ui";
import { cn } from "@/shared/utils";
import { SyncButton } from "./SyncButton";

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
 * Todos page header component.
 *
 * @example
 * ```tsx
 * <TodosHeader onLogout={handleLogout} onSync={handleSync} />
 * ```
 */
export function TodosHeader({ onLogout, onSync }: TodosHeaderProps) {
  const auth = authStore();
  const network = networkStore();

  const { user, isOnline } = useSelector(({ read }) => ({
    user: read(auth.user$),
    isOnline: read(network.isOnline$),
  }));

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <ListTodo className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold text-gray-900 text-sm sm:text-base">
                Secure Todo
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                {user?.username}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="shrink-0"
          >
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs sm:text-sm font-medium",
              isOnline
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            )}
          >
            {isOnline ? (
              <Wifi className="h-3.5 w-3.5" />
            ) : (
              <WifiOff className="h-3.5 w-3.5" />
            )}
            {isOnline ? "Online" : "Offline"}
          </div>
          <SyncButton onSync={onSync} />
        </div>
      </div>
    </header>
  );
}
