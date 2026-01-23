/**
 * Atomirx React DevTools
 *
 * A React-based devtools UI for inspecting atomirx entities.
 *
 * @packageDocumentation
 *
 * @example Basic usage
 * ```tsx
 * import { DevToolsPanel } from 'atomirx/react-devtools';
 *
 * function App() {
 *   return (
 *     <>
 *       <YourApp />
 *       <DevToolsPanel />
 *     </>
 *   );
 * }
 * ```
 *
 * @example With custom options
 * ```tsx
 * <DevToolsPanel
 *   defaultPosition="right"
 *   defaultOpen={process.env.NODE_ENV === 'development'}
 *   enableInProduction={false}
 * />
 * ```
 */

export { DevToolsPanel } from "./DevToolsPanel";
export type { DevToolsPanelProps } from "./DevToolsPanel";

// Re-export useful types from devtools
export type {
  DevtoolsTab,
  AtomFilter,
  PanelPosition,
  DevtoolsPreferences,
  EntityInfo,
  EntityType,
} from "../devtools/types";

// Re-export setup functions for manual control
export {
  setupDevtools,
  getDevtoolsRegistry,
  isDevtoolsEnabled,
} from "../devtools/setup";

// Export hooks for custom integrations
export {
  useDevtoolsPreferences,
  useDevtoolsRegistry,
  useDevtoolsLogs,
  useKeyboardShortcuts,
  usePanelResize,
  serializeValue,
  formatTimestamp,
} from "./hooks";
