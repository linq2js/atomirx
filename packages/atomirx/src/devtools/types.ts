import type { MutableAtom, DerivedAtom, Pool, AtomState } from "../core/types";
import type { Effect } from "../core/effect";

/**
 * Entity types tracked by devtools.
 */
export type EntityType = "mutable" | "derived" | "effect" | "pool" | "module";

/**
 * Base information for all tracked entities.
 */
export interface BaseEntityInfo {
  /** Unique identifier for this entity */
  id: string;
  /** Entity type discriminator */
  type: EntityType;
  /** Optional user-provided key for debugging */
  key: string | undefined;
  /** Timestamp when entity was created */
  createdAt: number;
  /** Number of times the entity value changed */
  changeCount: number;
  /** Last update timestamp */
  lastUpdatedAt: number;
}

/**
 * Information for mutable atoms.
 */
export interface MutableEntityInfo extends BaseEntityInfo {
  type: "mutable";
  /** WeakRef to the atom instance (avoids memory leaks) */
  instanceRef: WeakRef<MutableAtom<unknown>>;
  /** Current subscriber count */
  subscriberCount: number;
  /** Change history (limited buffer) */
  history: ChangeHistoryEntry[];
}

/**
 * Information for derived atoms.
 */
export interface DerivedEntityInfo extends BaseEntityInfo {
  type: "derived";
  /** WeakRef to the derived atom instance */
  instanceRef: WeakRef<DerivedAtom<unknown, boolean>>;
  /** IDs of atoms this derived depends on */
  dependencyIds: string[];
  /** Current subscriber count */
  subscriberCount: number;
  /** Change history (limited buffer) */
  history: ChangeHistoryEntry[];
}

/**
 * Information for effects.
 */
export interface EffectEntityInfo extends BaseEntityInfo {
  type: "effect";
  /** WeakRef to the effect instance */
  instanceRef: WeakRef<Effect>;
  /** IDs of atoms this effect depends on */
  dependencyIds: string[];
  /** Number of times the effect has run */
  runCount: number;
  /** Whether the effect is currently active */
  isActive: boolean;
}

/**
 * Information for pools.
 */
export interface PoolEntityInfo extends BaseEntityInfo {
  type: "pool";
  /** WeakRef to the pool instance */
  instanceRef: WeakRef<Pool<unknown, unknown>>;
  /** Current number of entries in the pool */
  entryCount: number;
  /** GC time configuration */
  gcTime: number;
}

/**
 * Information for modules (define).
 */
export interface ModuleEntityInfo extends BaseEntityInfo {
  type: "module";
  /** WeakRef to the module instance */
  instanceRef: WeakRef<object>;
}

/**
 * Union type for all entity info types.
 */
export type EntityInfo =
  | MutableEntityInfo
  | DerivedEntityInfo
  | EffectEntityInfo
  | PoolEntityInfo
  | ModuleEntityInfo;

/**
 * Entry in the change history buffer.
 */
export interface ChangeHistoryEntry {
  /** Timestamp of the change */
  timestamp: number;
  /** Serialized previous value (JSON string or "[unserializable]") */
  previousValue: string;
  /** Serialized new value */
  newValue: string;
}

/**
 * Options for setting up devtools.
 */
export interface DevtoolsOptions {
  /**
   * Maximum number of history entries to keep per entity.
   * @default 50
   */
  maxHistorySize?: number;

  /**
   * Whether to enable devtools in production.
   * @default false
   */
  enableInProduction?: boolean;

  /**
   * Custom name for this devtools instance (useful for multiple apps).
   * @default "atomirx-devtools"
   */
  name?: string;
}

/**
 * DevTools registry interface for accessing tracked entities.
 */
export interface DevtoolsRegistry {
  /** All tracked entities by ID */
  readonly entities: ReadonlyMap<string, EntityInfo>;

  /** All log entries */
  readonly logs: readonly LogEntry[];

  /**
   * Get entities filtered by type.
   */
  getByType<T extends EntityType>(type: T): EntityInfo[];

  /**
   * Get a specific entity by ID.
   */
  get(id: string): EntityInfo | undefined;

  /**
   * Add a log entry.
   */
  addLog(entry: NewLogEntry): void;

  /**
   * Clear all logs.
   */
  clearLogs(): void;

  /**
   * Subscribe to registry changes.
   * @returns Unsubscribe function
   */
  subscribe(listener: () => void): () => void;

  /**
   * Get current statistics.
   */
  getStats(): DevtoolsStats;

  /**
   * Clear all tracked entities.
   */
  clear(): void;
}

/**
 * Statistics about tracked entities.
 */
export interface DevtoolsStats {
  mutableCount: number;
  derivedCount: number;
  effectCount: number;
  poolCount: number;
  moduleCount: number;
  totalCount: number;
}

/**
 * Panel position options.
 */
export type PanelPosition = "bottom" | "right" | "left";

/**
 * Tab types in the devtools UI.
 */
export type DevtoolsTab = "atoms" | "effects" | "pools" | "modules" | "logs";

/**
 * Log entry types.
 */
export type LogEntryType =
  | "action.dispatch"
  | "error"
  | "mutable.change"
  | "mutable.reset"
  | "derived.change"
  | "derived.refresh"
  | "pool.create"
  | "pool.set"
  | "pool.remove";

/**
 * Log entry for action dispatch events.
 */
export interface ActionDispatchLogEntry {
  id: string;
  type: "action.dispatch";
  timestamp: number;
  actionKey: string;
  deps: string;
}

/**
 * Log entry for error events.
 */
export interface ErrorLogEntry {
  id: string;
  type: "error";
  timestamp: number;
  sourceType: string;
  sourceKey: string | undefined;
  error: string;
}

/**
 * Log entry for mutable atom change events.
 */
export interface MutableChangeLogEntry {
  id: string;
  type: "mutable.change";
  timestamp: number;
  atomKey: string;
}

/**
 * Log entry for mutable atom reset events.
 */
export interface MutableResetLogEntry {
  id: string;
  type: "mutable.reset";
  timestamp: number;
  atomKey: string;
}

/**
 * Log entry for derived atom change events.
 */
export interface DerivedChangeLogEntry {
  id: string;
  type: "derived.change";
  timestamp: number;
  atomKey: string;
}

/**
 * Log entry for derived atom refresh events.
 */
export interface DerivedRefreshLogEntry {
  id: string;
  type: "derived.refresh";
  timestamp: number;
  atomKey: string;
}

/**
 * Log entry for pool create events.
 */
export interface PoolCreateLogEntry {
  id: string;
  type: "pool.create";
  timestamp: number;
  poolKey: string;
  params: string;
}

/**
 * Log entry for pool set events.
 */
export interface PoolSetLogEntry {
  id: string;
  type: "pool.set";
  timestamp: number;
  poolKey: string;
  params: string;
}

/**
 * Log entry for pool remove events.
 */
export interface PoolRemoveLogEntry {
  id: string;
  type: "pool.remove";
  timestamp: number;
  poolKey: string;
  params: string;
}

/**
 * Union type for all log entries.
 */
export type LogEntry =
  | ActionDispatchLogEntry
  | ErrorLogEntry
  | MutableChangeLogEntry
  | MutableResetLogEntry
  | DerivedChangeLogEntry
  | DerivedRefreshLogEntry
  | PoolCreateLogEntry
  | PoolSetLogEntry
  | PoolRemoveLogEntry;

/**
 * New log entry without ID (for adding).
 */
export type NewLogEntry =
  | Omit<ActionDispatchLogEntry, "id">
  | Omit<ErrorLogEntry, "id">
  | Omit<MutableChangeLogEntry, "id">
  | Omit<MutableResetLogEntry, "id">
  | Omit<DerivedChangeLogEntry, "id">
  | Omit<DerivedRefreshLogEntry, "id">
  | Omit<PoolCreateLogEntry, "id">
  | Omit<PoolSetLogEntry, "id">
  | Omit<PoolRemoveLogEntry, "id">;

/**
 * Filter options for atoms tab.
 */
export type AtomFilter = "all" | "mutable" | "derived";

/**
 * Persisted user preferences for devtools UI.
 */
export interface DevtoolsPreferences {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Current panel position */
  position: PanelPosition;
  /** Currently active tab */
  activeTab: DevtoolsTab;
  /** Panel size (height for bottom, width for left/right) */
  panelSize: number;
  /** Search text per tab */
  searchText: Record<DevtoolsTab, string>;
  /** Filter for atoms tab */
  atomFilter: AtomFilter;
  /** Selected entity ID (if any) */
  selectedEntityId: string | null;
  /** Whether to show atom values (may trigger lazy computation) */
  showAtomValues: boolean;
}

/**
 * Default preferences.
 */
export const DEFAULT_PREFERENCES: DevtoolsPreferences = {
  isOpen: false,
  position: "bottom",
  activeTab: "atoms",
  panelSize: 300,
  searchText: {
    atoms: "",
    effects: "",
    pools: "",
    modules: "",
    logs: "",
  },
  atomFilter: "all",
  selectedEntityId: null,
  showAtomValues: false,
};

/**
 * State for an atom as displayed in devtools.
 */
export interface DevtoolsAtomState {
  status: AtomState<unknown>["status"];
  value: unknown;
  error: unknown;
}
