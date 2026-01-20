/**
 * FilterBar presentation component.
 *
 * @description
 * Pure presentation component for FilterBar.
 *
 * @businessRules
 * - Three filter options: all, active, completed
 * - Active filter is visually highlighted
 */

import { Filter, Circle, CheckCircle2 } from "lucide-react";
import type { TodoFilterType } from "../../stores/todosStore";
import { cn } from "@/shared/utils";

/**
 * FilterBar pure component props.
 */
export interface FilterBarPureProps {
  /** Current filter */
  filter: TodoFilterType;
  /** Handle filter change */
  onFilterChange: (filter: TodoFilterType) => void;
}

const filters: {
  value: TodoFilterType;
  label: string;
  icon: typeof Filter;
}[] = [
  { value: "all", label: "All", icon: Filter },
  { value: "active", label: "Active", icon: Circle },
  { value: "completed", label: "Completed", icon: CheckCircle2 },
];

/**
 * FilterBar pure presentation component.
 *
 * @example
 * ```tsx
 * <FilterBarPure filter="all" onFilterChange={setFilter} />
 * ```
 */
export function FilterBarPure({ filter, onFilterChange }: FilterBarPureProps) {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {filters.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => onFilterChange(value)}
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
