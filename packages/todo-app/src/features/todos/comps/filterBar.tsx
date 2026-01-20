/**
 * Filter bar component.
 *
 * @description
 * Displays filter buttons for todo list (All, Active, Completed).
 * Highlights the currently active filter.
 *
 * @businessRules
 * - Three filter options: all, active, completed
 * - Active filter is visually highlighted
 * - Clicking a filter updates the todos store filter state
 */

import { useSelector } from "atomirx/react";
import { Filter, Circle, CheckCircle2 } from "lucide-react";
import { todosStore } from "../stores";
import type { TodoFilterType } from "../stores";
import { cn } from "@/shared/utils";

/**
 * Filter bar component.
 *
 * @example
 * ```tsx
 * <FilterBar />
 * ```
 */
export function FilterBar() {
  const todos = todosStore();
  const filter = useSelector(todos.filter$);

  const filters: {
    value: TodoFilterType;
    label: string;
    icon: typeof Filter;
  }[] = [
    { value: "all", label: "All", icon: Filter },
    { value: "active", label: "Active", icon: Circle },
    { value: "completed", label: "Completed", icon: CheckCircle2 },
  ];

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {filters.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => todos.setFilter(value)}
          className={cn(
            "flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors",
            filter === value
              ? "bg-blue-100 text-blue-700"
              : "text-gray-600 hover:bg-gray-100"
          )}
        >
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
