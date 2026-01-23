import type { CSSProperties } from "react";
import {
  DEVTOOLS_Z_INDEX,
  FLOATING_BUTTON_SIZE,
  ANIMATION_DURATION,
} from "../devtools/constants";

/**
 * CSS variables for theming.
 * Users can override these via CSS custom properties.
 */
export const cssVariables = {
  // Colors
  "--atomirx-bg-primary": "#1a1a2e",
  "--atomirx-bg-secondary": "#16213e",
  "--atomirx-bg-tertiary": "#0f3460",
  "--atomirx-bg-hover": "#1f4287",
  "--atomirx-text-primary": "#eaeaea",
  "--atomirx-text-secondary": "#a0a0a0",
  "--atomirx-text-muted": "#666666",
  "--atomirx-border": "#2a2a4a",
  "--atomirx-accent": "#e94560",
  "--atomirx-accent-hover": "#ff6b6b",
  "--atomirx-success": "#4ade80",
  "--atomirx-warning": "#fbbf24",
  "--atomirx-error": "#ef4444",
  "--atomirx-info": "#3b82f6",

  // Badges
  "--atomirx-badge-mutable": "#3b82f6",
  "--atomirx-badge-derived": "#8b5cf6",
  "--atomirx-badge-effect": "#f59e0b",
  "--atomirx-badge-pool": "#10b981",
  "--atomirx-badge-module": "#ec4899",

  // Sizing
  "--atomirx-radius": "6px",
  "--atomirx-radius-lg": "8px",
  "--atomirx-font-size": "11px",
  "--atomirx-font-size-sm": "9px",
  "--atomirx-font-mono":
    "ui-monospace, SFMono-Regular, SF Mono, Menlo, monospace",
} as const;

/**
 * Base container styles with CSS variables.
 */
export const baseContainerStyle: CSSProperties = {
  ...Object.fromEntries(Object.entries(cssVariables).map(([k, v]) => [k, v])),
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontSize: "var(--atomirx-font-size)",
  color: "var(--atomirx-text-primary)",
  boxSizing: "border-box",
};

/**
 * Floating toggle button styles.
 */
export const floatingButtonStyle: CSSProperties = {
  position: "fixed",
  bottom: 16,
  left: 16,
  width: FLOATING_BUTTON_SIZE,
  height: FLOATING_BUTTON_SIZE,
  borderRadius: "50%",
  backgroundColor: "var(--atomirx-accent)",
  color: "white",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
  zIndex: DEVTOOLS_Z_INDEX + 1,
  transition: `transform ${ANIMATION_DURATION}ms ease, background-color ${ANIMATION_DURATION}ms ease`,
};

/**
 * Panel container styles by position.
 * Uses non-shorthand border properties to avoid React warnings.
 */
export const getPanelStyle = (
  position: "bottom" | "right" | "left",
  size: number,
  isOpen: boolean
): CSSProperties => {
  const base: CSSProperties = {
    position: "fixed",
    backgroundColor: "var(--atomirx-bg-primary)",
    borderColor: "var(--atomirx-border)",
    borderStyle: "solid",
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    zIndex: DEVTOOLS_Z_INDEX,
    display: "flex",
    flexDirection: "column",
    transition: `transform ${ANIMATION_DURATION}ms ease`,
    overflow: "hidden",
  };

  switch (position) {
    case "bottom":
      return {
        ...base,
        left: 0,
        right: 0,
        bottom: 0,
        height: size,
        borderTopWidth: 1,
        transform: isOpen ? "translateY(0)" : "translateY(100%)",
      };
    case "right":
      return {
        ...base,
        top: 0,
        right: 0,
        bottom: 0,
        width: size,
        borderLeftWidth: 1,
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
      };
    case "left":
      return {
        ...base,
        top: 0,
        left: 0,
        bottom: 0,
        width: size,
        borderRightWidth: 1,
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
      };
  }
};

/**
 * Tab bar styles.
 */
export const tabBarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 0,
  backgroundColor: "var(--atomirx-bg-secondary)",
  borderBottom: "1px solid var(--atomirx-border)",
  padding: "0 8px",
  height: 40,
  flexShrink: 0,
};

/**
 * Tab button styles.
 */
export const getTabStyle = (isActive: boolean): CSSProperties => ({
  padding: "8px 14px",
  background: "none",
  border: "none",
  color: isActive
    ? "var(--atomirx-text-primary)"
    : "var(--atomirx-text-secondary)",
  cursor: "pointer",
  fontSize: "var(--atomirx-font-size)",
  fontWeight: isActive ? 600 : 400,
  borderBottom: isActive
    ? "2px solid var(--atomirx-accent)"
    : "2px solid transparent",
  marginBottom: -1,
  transition: `color ${ANIMATION_DURATION}ms ease, border-color ${ANIMATION_DURATION}ms ease`,
});

/**
 * Toolbar styles (search, filter, actions).
 */
export const toolbarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px",
  backgroundColor: "var(--atomirx-bg-secondary)",
  borderBottom: "1px solid var(--atomirx-border)",
  flexShrink: 0,
};

/**
 * Search input styles.
 */
export const searchInputStyle: CSSProperties = {
  flex: 1,
  padding: "6px 10px",
  backgroundColor: "var(--atomirx-bg-tertiary)",
  border: "1px solid var(--atomirx-border)",
  borderRadius: "var(--atomirx-radius)",
  color: "var(--atomirx-text-primary)",
  fontSize: "var(--atomirx-font-size)",
  outline: "none",
  minWidth: 0,
};

/**
 * Filter button group styles.
 */
export const filterGroupStyle: CSSProperties = {
  display: "flex",
  gap: 0,
  borderRadius: "var(--atomirx-radius)",
  overflow: "hidden",
  border: "1px solid var(--atomirx-border)",
};

/**
 * Filter button styles.
 */
export const getFilterButtonStyle = (isActive: boolean): CSSProperties => ({
  padding: "4px 10px",
  background: isActive
    ? "var(--atomirx-bg-hover)"
    : "var(--atomirx-bg-tertiary)",
  border: "none",
  color: isActive
    ? "var(--atomirx-text-primary)"
    : "var(--atomirx-text-secondary)",
  cursor: "pointer",
  fontSize: "var(--atomirx-font-size-sm)",
  transition: `background-color ${ANIMATION_DURATION}ms ease`,
});

/**
 * Entity list container styles.
 */
export const entityListStyle: CSSProperties = {
  flex: 1,
  overflow: "auto",
  padding: 0,
};

/**
 * Entity item styles.
 */
export const getEntityItemStyle = (isSelected: boolean): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px",
  borderBottom: "1px solid var(--atomirx-border)",
  cursor: "pointer",
  backgroundColor: isSelected ? "var(--atomirx-bg-hover)" : "transparent",
  transition: `background-color ${ANIMATION_DURATION}ms ease`,
});

/**
 * Entity type badge styles.
 */
export const getTypeBadgeStyle = (
  type: "mutable" | "derived" | "effect" | "pool" | "module"
): CSSProperties => {
  const colorMap = {
    mutable: "var(--atomirx-badge-mutable)",
    derived: "var(--atomirx-badge-derived)",
    effect: "var(--atomirx-badge-effect)",
    pool: "var(--atomirx-badge-pool)",
    module: "var(--atomirx-badge-module)",
  };

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 22,
    height: 22,
    borderRadius: "var(--atomirx-radius)",
    backgroundColor: colorMap[type],
    color: "white",
    fontSize: "var(--atomirx-font-size-sm)",
    fontWeight: 600,
    flexShrink: 0,
  };
};

/**
 * Entity key/name styles.
 */
export const entityKeyStyle: CSSProperties = {
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontFamily: "var(--atomirx-font-mono)",
  fontSize: 11,
};

/**
 * Entity value preview styles.
 */
export const entityValueStyle: CSSProperties = {
  color: "var(--atomirx-text-muted)",
  fontSize: "var(--atomirx-font-size-sm)",
  fontFamily: "var(--atomirx-font-mono)",
  maxWidth: 150,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

/**
 * Details panel styles.
 */
export const detailsPanelStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "var(--atomirx-bg-primary)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  zIndex: 100,
};

/**
 * Details header styles.
 */
export const detailsHeaderStyle: CSSProperties = {
  padding: "10px",
  borderBottom: "1px solid var(--atomirx-border)",
  fontWeight: 600,
};

/**
 * Details section styles.
 */
export const detailsSectionStyle: CSSProperties = {
  padding: "10px",
  borderBottom: "1px solid var(--atomirx-border)",
};

/**
 * Details label styles.
 */
export const detailsLabelStyle: CSSProperties = {
  fontSize: "var(--atomirx-font-size-sm)",
  color: "var(--atomirx-text-secondary)",
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

/**
 * Details value styles.
 */
export const detailsValueStyle: CSSProperties = {
  fontFamily: "var(--atomirx-font-mono)",
  fontSize: "var(--atomirx-font-size)",
  wordBreak: "break-all",
};

/**
 * Code block styles.
 */
export const codeBlockStyle: CSSProperties = {
  backgroundColor: "var(--atomirx-bg-tertiary)",
  padding: "6px 8px",
  borderRadius: "var(--atomirx-radius)",
  fontFamily: "var(--atomirx-font-mono)",
  fontSize: "var(--atomirx-font-size-sm)",
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
};

/**
 * History entry styles.
 */
export const historyEntryStyle: CSSProperties = {
  padding: "4px 0",
  borderBottom: "1px solid var(--atomirx-border)",
  fontSize: "var(--atomirx-font-size-sm)",
};

/**
 * History timestamp styles.
 */
export const historyTimestampStyle: CSSProperties = {
  color: "var(--atomirx-text-muted)",
  fontSize: "var(--atomirx-font-size-sm)",
};

/**
 * Position button styles.
 */
export const positionButtonStyle: CSSProperties = {
  padding: "4px 8px",
  background: "var(--atomirx-bg-tertiary)",
  border: "1px solid var(--atomirx-border)",
  borderRadius: "var(--atomirx-radius)",
  color: "var(--atomirx-text-secondary)",
  cursor: "pointer",
  fontSize: "var(--atomirx-font-size-sm)",
  marginLeft: "auto",
};

/**
 * Close button styles.
 */
export const closeButtonStyle: CSSProperties = {
  padding: "4px 8px",
  background: "none",
  border: "none",
  color: "var(--atomirx-text-secondary)",
  cursor: "pointer",
  fontSize: 18,
  lineHeight: 1,
};

/**
 * Empty state styles.
 */
export const emptyStateStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 32,
  color: "var(--atomirx-text-muted)",
  fontStyle: "italic",
};

/**
 * Status indicator styles.
 */
export const getStatusStyle = (
  status: "ready" | "loading" | "error"
): CSSProperties => {
  const colorMap = {
    ready: "var(--atomirx-success)",
    loading: "var(--atomirx-warning)",
    error: "var(--atomirx-error)",
  };

  return {
    display: "inline-block",
    width: 8,
    height: 8,
    borderRadius: "50%",
    backgroundColor: colorMap[status],
    marginRight: 6,
  };
};

/**
 * Resize handle styles.
 */
export const getResizeHandleStyle = (
  position: "bottom" | "right" | "left"
): CSSProperties => {
  const base: CSSProperties = {
    position: "absolute",
    backgroundColor: "transparent",
    zIndex: 1,
  };

  switch (position) {
    case "bottom":
      return {
        ...base,
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        cursor: "ns-resize",
      };
    case "right":
      return {
        ...base,
        top: 0,
        left: 0,
        bottom: 0,
        width: 4,
        cursor: "ew-resize",
      };
    case "left":
      return {
        ...base,
        top: 0,
        right: 0,
        bottom: 0,
        width: 4,
        cursor: "ew-resize",
      };
  }
};

/**
 * Main content area styles.
 */
export const mainContentStyle: CSSProperties = {
  display: "flex",
  flex: 1,
  overflow: "hidden",
};

/**
 * Stat badge styles.
 */
export const statBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 20,
  height: 18,
  padding: "0 6px",
  borderRadius: 9,
  backgroundColor: "var(--atomirx-bg-hover)",
  color: "var(--atomirx-text-secondary)",
  fontSize: "var(--atomirx-font-size-sm)",
  fontWeight: 500,
  marginLeft: 6,
};
