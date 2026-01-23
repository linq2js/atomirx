import { memo, useCallback, useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { getDevtoolsRegistry, setupDevtools } from "../devtools/setup";
import type { DevtoolsTab, AtomFilter, PanelPosition } from "../devtools/types";
import {
  useDevtoolsPreferences,
  useDevtoolsRegistry,
  useDevtoolsLogs,
  useKeyboardShortcuts,
  usePanelResize,
} from "./hooks";
import { EntityList } from "./EntityList";
import { EntityDetails } from "./EntityDetails";
import { LogList } from "./LogList";
import {
  baseContainerStyle,
  floatingButtonStyle,
  getPanelStyle,
  tabBarStyle,
  getTabStyle,
  toolbarStyle,
  searchInputStyle,
  filterGroupStyle,
  getFilterButtonStyle,
  mainContentStyle,
  positionButtonStyle,
  closeButtonStyle,
  getResizeHandleStyle,
} from "./styles";

/**
 * Props for DevToolsPanel component.
 */
export interface DevToolsPanelProps {
  /**
   * Default panel position.
   * @default "bottom"
   */
  defaultPosition?: PanelPosition;

  /**
   * Whether the panel is open by default.
   * @default false
   */
  defaultOpen?: boolean;

  /**
   * Whether to auto-setup devtools on mount.
   * If false, you must call setupDevtools() yourself.
   * @default true
   */
  autoSetup?: boolean;

  /**
   * Enable devtools in production.
   * @default false
   */
  enableInProduction?: boolean;
}

/**
 * Atomirx logo/icon for the floating button.
 */
function AtomirxIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Atom-like icon */}
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <ellipse
        cx="12"
        cy="12"
        rx="10"
        ry="4"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="10"
        ry="4"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        transform="rotate(60 12 12)"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="10"
        ry="4"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        transform="rotate(120 12 12)"
      />
    </svg>
  );
}

/**
 * Position icon for the position toggle button.
 * Generic dock/layout icon.
 */
function PositionIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

/**
 * Tab configuration.
 */
const TABS: Array<{ id: DevtoolsTab; label: string }> = [
  { id: "atoms", label: "Atoms" },
  { id: "effects", label: "Effects" },
  { id: "pools", label: "Pools" },
  { id: "modules", label: "Modules" },
  { id: "logs", label: "Logs" },
];

/**
 * Filter options for atoms tab.
 */
const ATOM_FILTERS: Array<{ id: AtomFilter; label: string }> = [
  { id: "all", label: "A" },
  { id: "mutable", label: "M" },
  { id: "derived", label: "D" },
];

/**
 * DevTools panel component.
 *
 * Provides a floating UI panel for inspecting atomirx entities.
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
 * @example Custom defaults
 * ```tsx
 * <DevToolsPanel
 *   defaultPosition="right"
 *   defaultOpen={true}
 * />
 * ```
 */
/**
 * Internal panel component (rendered inside portal).
 */
const DevToolsPanelInternal = memo(function DevToolsPanelInternal({
  defaultPosition,
  defaultOpen,
  autoSetup = true,
  enableInProduction = false,
}: DevToolsPanelProps) {
  // Setup devtools on mount
  useEffect(() => {
    if (autoSetup) {
      return setupDevtools({ enableInProduction });
    }
  }, [autoSetup, enableInProduction]);

  // Get registry
  const [registry, setRegistry] = useState(() => getDevtoolsRegistry());

  // Re-check registry after setup
  useEffect(() => {
    const checkRegistry = () => {
      const reg = getDevtoolsRegistry();
      if (reg !== registry) {
        setRegistry(reg);
      }
    };
    checkRegistry();
    // Check again after a short delay in case setup is async
    const timeout = setTimeout(checkRegistry, 100);
    return () => clearTimeout(timeout);
  }, [registry]);

  // Subscribe to registry changes
  const entities = useDevtoolsRegistry(registry);
  const logs = useDevtoolsLogs(registry);

  // Preferences with persistence
  const {
    preferences,
    setIsOpen,
    setActiveTab,
    setPanelSize,
    setSearchText,
    setAtomFilter,
    setSelectedEntityId,
    togglePanel,
    cyclePosition,
    toggleShowAtomValues,
  } = useDevtoolsPreferences();

  // Apply defaults on first render
  useEffect(() => {
    if (defaultPosition && preferences.position !== defaultPosition) {
      // Only apply if this is truly the first render (no stored preference)
    }
    if (defaultOpen !== undefined && !preferences.isOpen && defaultOpen) {
      setIsOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts(togglePanel);

  // Panel resize
  const { handleMouseDown } = usePanelResize(
    preferences.position,
    preferences.panelSize,
    setPanelSize
  );

  // Selected entity
  const selectedEntity = preferences.selectedEntityId
    ? entities?.get(preferences.selectedEntityId)
    : null;

  // Handle search change
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchText(preferences.activeTab, e.target.value);
    },
    [preferences.activeTab, setSearchText]
  );

  // Clear selection when switching tabs
  const handleTabChange = useCallback(
    (tab: DevtoolsTab) => {
      setActiveTab(tab);
      setSelectedEntityId(null);
    },
    [setActiveTab, setSelectedEntityId]
  );

  if (!registry) {
    return null;
  }

  return (
    <div style={baseContainerStyle}>
      {/* Floating toggle button - hidden when panel is open */}
      {!preferences.isOpen && (
        <button
          style={floatingButtonStyle}
          onClick={togglePanel}
          title="Toggle Atomirx DevTools (Ctrl+Shift+D)"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "var(--atomirx-accent-hover)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "var(--atomirx-accent)";
          }}
        >
          <AtomirxIcon />
        </button>
      )}

      {/* Main panel */}
      <div
        style={getPanelStyle(
          preferences.position,
          preferences.panelSize,
          preferences.isOpen
        )}
      >
        {/* Resize handle */}
        <div
          style={getResizeHandleStyle(preferences.position)}
          onMouseDown={handleMouseDown}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            backgroundColor: "var(--atomirx-bg-secondary)",
            borderBottom: "1px solid var(--atomirx-border)",
            flexShrink: 0,
          }}
        >
          <span
            style={{ fontWeight: 600, fontSize: "var(--atomirx-font-size)" }}
          >
            Atomirx Devtools
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {/* Position toggle */}
            <button
              style={positionButtonStyle}
              onClick={cyclePosition}
              title={`Position: ${preferences.position} (click to change)`}
            >
              <PositionIcon />
            </button>

            {/* Close button */}
            <button
              style={closeButtonStyle}
              onClick={() => setIsOpen(false)}
              title="Close panel"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content area wrapper - details overlay covers this entire area */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            position: "relative",
            minHeight: 0,
          }}
        >
          {/* Tab bar */}
          <div style={tabBarStyle}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                style={getTabStyle(preferences.activeTab === tab.id)}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div
            style={{
              padding: "8px 12px",
              borderBottom: "1px solid var(--atomirx-border)",
            }}
          >
            <input
              type="text"
              style={{ ...searchInputStyle, width: "100%" }}
              placeholder={`Search ${preferences.activeTab}...`}
              value={preferences.searchText[preferences.activeTab]}
              onChange={handleSearchChange}
            />
          </div>

          {/* Filter bar (only for atoms tab) */}
          {preferences.activeTab === "atoms" && (
            <div style={{ ...toolbarStyle, justifyContent: "space-between" }}>
              <div style={filterGroupStyle}>
                {ATOM_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    style={getFilterButtonStyle(
                      preferences.atomFilter === filter.id
                    )}
                    onClick={() => setAtomFilter(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              {/* Show values toggle */}
              <button
                style={{
                  ...getFilterButtonStyle(preferences.showAtomValues),
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px 8px",
                }}
                onClick={toggleShowAtomValues}
                title={
                  preferences.showAtomValues
                    ? "Hide values (single line)"
                    : "Show values (two lines with data)"
                }
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {preferences.showAtomValues ? (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  ) : (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <path d="M1 1l22 22" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          )}

          {/* Main content */}
          <div style={mainContentStyle}>
            {preferences.activeTab === "logs" ? (
              <LogList
                logs={logs ?? []}
                searchText={preferences.searchText.logs}
                onClearLogs={() => registry.clearLogs()}
              />
            ) : (
              <EntityList
                entities={entities ?? new Map()}
                activeTab={preferences.activeTab}
                searchText={preferences.searchText[preferences.activeTab]}
                atomFilter={preferences.atomFilter}
                selectedEntityId={preferences.selectedEntityId}
                onSelectEntity={setSelectedEntityId}
                showValues={preferences.showAtomValues}
              />
            )}
          </div>

          {/* Entity details overlay - covers tabs, search, filter, and list */}
          {selectedEntity && preferences.activeTab !== "logs" && (
            <EntityDetails
              entity={selectedEntity}
              onClose={() => setSelectedEntityId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
});

/**
 * Options for renderDevtools function.
 */
export interface RenderDevtoolsOptions extends DevToolsPanelProps {
  /**
   * Custom container element ID.
   * @default "atomirx-devtools-root"
   */
  containerId?: string;
  root?: Root;
}

/**
 * Global reference to the devtools React root for cleanup.
 */
let devtoolsRoot: Root | null = null;
let devtoolsContainer: HTMLElement | null = null;

/**
 * Renders devtools in a separate React root.
 *
 * This isolates devtools from the main app's React tree to avoid:
 * - Concurrent update issues
 * - Bugs from app impacting devtools and vice versa
 * - React tree conflicts
 *
 * @param options - Configuration options for devtools
 * @returns Promise that resolves when devtools is mounted
 *
 * @example Basic usage
 * ```tsx
 * // In main.tsx
 * import { renderDevtools } from 'atomirx/react-devtools';
 *
 * // Render devtools first (optional: wait for completion)
 * await renderDevtools();
 *
 * // Then render your app
 * ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
 * ```
 *
 * @example With options
 * ```tsx
 * renderDevtools({
 *   defaultPosition: "right",
 *   defaultOpen: true,
 *   autoSetup: true,
 * });
 * ```
 */
export function renderDevtools(
  options: RenderDevtoolsOptions = {}
): Promise<void> {
  return new Promise((resolve) => {
    const { containerId = "atomirx-devtools-root", ...panelProps } = options;

    // Clean up existing devtools if any
    if (devtoolsRoot) {
      devtoolsRoot.unmount();
      devtoolsRoot = null;
    }
    if (devtoolsContainer) {
      devtoolsContainer.remove();
      devtoolsContainer = null;
    }

    // Setup devtools if autoSetup is not explicitly false
    if (panelProps.autoSetup !== false) {
      setupDevtools({ enableInProduction: panelProps.enableInProduction });
    }

    // Create container element
    const container = document.createElement("div");
    container.id = containerId;
    container.style.position = "fixed";
    container.style.top = "0";
    container.style.left = "0";
    container.style.width = "0";
    container.style.height = "0";
    container.style.overflow = "visible";
    container.style.zIndex = "999999";
    container.style.pointerEvents = "none";
    document.body.appendChild(container);
    devtoolsContainer = container;

    // Create separate React root for devtools
    devtoolsRoot = options.root ?? createRoot(container);
    devtoolsRoot.render(
      <div style={{ pointerEvents: "auto" }}>
        <DevToolsPanelInternal {...panelProps} autoSetup={false} />
      </div>
    );

    // Resolve after a microtask to ensure render is scheduled
    queueMicrotask(resolve);
  });
}

/**
 * Unmounts and cleans up devtools.
 *
 * @example
 * ```tsx
 * import { unmountDevtools } from 'atomirx/react-devtools';
 *
 * // Clean up devtools
 * unmountDevtools();
 * ```
 */
export function unmountDevtools(): void {
  if (devtoolsRoot) {
    devtoolsRoot.unmount();
    devtoolsRoot = null;
  }
  if (devtoolsContainer) {
    devtoolsContainer.remove();
    devtoolsContainer = null;
  }
}

/**
 * DevTools panel component (legacy - prefer renderDevtools).
 *
 * This component renders devtools within the app's React tree.
 * For better isolation, use renderDevtools() instead.
 *
 * @deprecated Use renderDevtools() for better isolation from app React tree
 */
export const DevToolsPanel = memo(function DevToolsPanel(
  props: DevToolsPanelProps
) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Render devtools in separate root
    renderDevtools({ ...props, autoSetup: props.autoSetup });
    setMounted(true);

    return () => {
      unmountDevtools();
    };
    // Only run on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // This component doesn't render anything - devtools renders in separate root
  return mounted ? null : null;
});
