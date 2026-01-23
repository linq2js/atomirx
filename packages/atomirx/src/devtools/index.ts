/**
 * Atomirx Devtools - Core API
 *
 * This module provides the core devtools functionality for tracking
 * and inspecting atomirx entities (atoms, derived, effects, pools, modules).
 *
 * @packageDocumentation
 *
 * @example Basic usage
 * ```ts
 * import { setupDevtools, getDevtoolsRegistry } from 'atomirx/devtools';
 *
 * // Enable devtools (call once at app startup)
 * setupDevtools();
 *
 * // Access registry for custom integrations
 * const registry = getDevtoolsRegistry();
 * if (registry) {
 *   registry.subscribe(() => {
 *     console.log('Entities changed:', registry.getStats());
 *   });
 * }
 * ```
 */

export {
  setupDevtools,
  getDevtoolsRegistry,
  isDevtoolsEnabled,
  _resetDevtools,
} from "./setup";

export { getRegistry, resetRegistry } from "./registry";

export type {
  // Entity types
  EntityType,
  EntityInfo,
  BaseEntityInfo,
  MutableEntityInfo,
  DerivedEntityInfo,
  EffectEntityInfo,
  PoolEntityInfo,
  ModuleEntityInfo,

  // Registry
  DevtoolsRegistry,
  DevtoolsStats,

  // Configuration
  DevtoolsOptions,

  // History
  ChangeHistoryEntry,

  // Logs
  LogEntry,
  LogEntryType,
  ActionDispatchLogEntry,
  ErrorLogEntry,
  PoolCreateLogEntry,
  NewLogEntry,

  // UI types (for react-devtools)
  PanelPosition,
  DevtoolsTab,
  AtomFilter,
  DevtoolsPreferences,
  DevtoolsAtomState,
} from "./types";

export { DEFAULT_PREFERENCES } from "./types";

export {
  STORAGE_KEY_PREFERENCES,
  DEFAULT_MAX_HISTORY_SIZE,
  ENTITY_ID_PREFIX,
  STORAGE_VERSION,
  DEVTOOLS_Z_INDEX,
  MIN_PANEL_SIZE,
  MAX_PANEL_SIZE,
  DEFAULT_PANEL_SIZE,
  FLOATING_BUTTON_SIZE,
  ANIMATION_DURATION,
} from "./constants";
