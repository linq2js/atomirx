/**
 * Atomirx React DevTools
 *
 * A React-based devtools UI for inspecting atomirx entities.
 *
 * @packageDocumentation
 *
 * @example Basic usage with renderDevtools (recommended)
 * ```tsx
 * // In main.tsx - renders devtools in separate React root
 * import { renderDevtools } from 'atomirx/react-devtools';
 *
 * renderDevtools().then(() => {
 *   // Devtools ready, now render your app
 *   ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
 * });
 * ```
 *
 * @example With custom options
 * ```tsx
 * renderDevtools({
 *   defaultPosition: "right",
 *   defaultOpen: process.env.NODE_ENV === 'development',
 *   enableInProduction: false,
 * });
 * ```
 */

export {
  DevToolsPanel,
  renderDevtools,
  unmountDevtools,
} from "./DevToolsPanel";
export type { DevToolsPanelProps, RenderDevtoolsOptions } from "./DevToolsPanel";

// Re-export everything from devtools for convenience
export * from "../devtools";

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
