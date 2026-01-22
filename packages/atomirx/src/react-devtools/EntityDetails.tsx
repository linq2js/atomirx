import { memo, useEffect, useMemo, useState } from "react";
import type {
  EntityInfo,
  MutableEntityInfo,
  DerivedEntityInfo,
  EffectEntityInfo,
  PoolEntityInfo,
  ModuleEntityInfo,
  ChangeHistoryEntry,
} from "../devtools/types";
import {
  detailsPanelStyle,
  detailsHeaderStyle,
  detailsSectionStyle,
  detailsLabelStyle,
  detailsValueStyle,
  codeBlockStyle,
  historyEntryStyle,
  historyTimestampStyle,
  closeButtonStyle,
  getTypeBadgeStyle,
  getStatusStyle,
} from "./styles";
import { serializeValue, formatTimestamp } from "./hooks";

interface EntityDetailsProps {
  entity: EntityInfo;
  onClose: () => void;
}

/**
 * Get current value for display.
 */
function getCurrentValue(entity: EntityInfo): {
  value: string;
  status?: "ready" | "loading" | "error";
} {
  const instance = entity.instanceRef.deref();
  if (!instance) {
    return { value: "[disposed]", status: "error" };
  }

  switch (entity.type) {
    case "mutable": {
      const atom = instance as import("../core/types").MutableAtom<unknown>;
      return { value: serializeValue(atom.get()), status: "ready" };
    }
    case "derived": {
      const derived = instance as import("../core/types").DerivedAtom<
        unknown,
        boolean
      >;
      const state = derived.state();
      if (state.status === "loading") {
        return { value: "[loading...]", status: "loading" };
      }
      if (state.status === "error") {
        return {
          value: serializeValue(state.error),
          status: "error",
        };
      }
      return { value: serializeValue(state.value), status: "ready" };
    }
    case "pool": {
      const pool = instance as import("../core/types").Pool<unknown, unknown>;
      const entries: Array<{ params: unknown; value: unknown }> = [];
      pool.forEach((value, params) => {
        entries.push({ params, value });
      });
      return { value: serializeValue(entries), status: "ready" };
    }
    case "effect":
    case "module":
      return { value: "[N/A]", status: "ready" };
    default:
      return { value: "[unknown]" };
  }
}

/**
 * Section component for details.
 */
function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={detailsSectionStyle}>
      <div style={detailsLabelStyle}>{label}</div>
      {children}
    </div>
  );
}

/**
 * History entry component.
 */
function HistoryEntryItem({ entry }: { entry: ChangeHistoryEntry }) {
  return (
    <div style={historyEntryStyle}>
      <div style={historyTimestampStyle}>
        {formatTimestamp(entry.timestamp)}
      </div>
      <div style={{ marginTop: 4 }}>
        <span style={{ color: "var(--atomirx-error)" }}>- </span>
        <span style={{ fontFamily: "var(--atomirx-font-mono)" }}>
          {entry.previousValue.length > 100
            ? entry.previousValue.slice(0, 100) + "..."
            : entry.previousValue}
        </span>
      </div>
      <div>
        <span style={{ color: "var(--atomirx-success)" }}>+ </span>
        <span style={{ fontFamily: "var(--atomirx-font-mono)" }}>
          {entry.newValue.length > 100
            ? entry.newValue.slice(0, 100) + "..."
            : entry.newValue}
        </span>
      </div>
    </div>
  );
}

/**
 * Mutable atom details.
 */
function MutableDetails({ entity }: { entity: MutableEntityInfo }) {
  const { value, status } = useMemo(() => getCurrentValue(entity), [entity]);

  return (
    <>
      <Section label="Current Value">
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <span style={getStatusStyle(status || "ready")} />
          <span style={detailsValueStyle}>{status}</span>
        </div>
        <div style={codeBlockStyle}>{value}</div>
      </Section>

      <Section label="Stats">
        <div style={detailsValueStyle}>
          <div>Changes: {entity.changeCount}</div>
          <div>Subscribers: {entity.subscriberCount}</div>
        </div>
      </Section>

      {entity.history.length > 0 && (
        <Section label={`History (${entity.history.length})`}>
          {entity.history.map((entry, idx) => (
            <HistoryEntryItem key={idx} entry={entry} />
          ))}
        </Section>
      )}
    </>
  );
}

/**
 * Derived atom details.
 */
function DerivedDetails({ entity }: { entity: DerivedEntityInfo }) {
  const { value, status } = useMemo(() => getCurrentValue(entity), [entity]);

  return (
    <>
      <Section label="Current Value">
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <span style={getStatusStyle(status || "ready")} />
          <span style={detailsValueStyle}>{status}</span>
        </div>
        <div style={codeBlockStyle}>{value}</div>
      </Section>

      <Section label="Stats">
        <div style={detailsValueStyle}>
          <div>Changes: {entity.changeCount}</div>
          <div>Subscribers: {entity.subscriberCount}</div>
          <div>Dependencies: {entity.dependencyIds.length || "unknown"}</div>
        </div>
      </Section>

      {entity.dependencyIds.length > 0 && (
        <Section label="Dependencies">
          <div style={codeBlockStyle}>
            {entity.dependencyIds.map((id) => (
              <div key={id}>{id}</div>
            ))}
          </div>
        </Section>
      )}

      {entity.history.length > 0 && (
        <Section label={`History (${entity.history.length})`}>
          {entity.history.map((entry, idx) => (
            <HistoryEntryItem key={idx} entry={entry} />
          ))}
        </Section>
      )}
    </>
  );
}

/**
 * Effect details.
 */
function EffectDetails({ entity }: { entity: EffectEntityInfo }) {
  return (
    <>
      <Section label="Status">
        <div style={detailsValueStyle}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={getStatusStyle(entity.isActive ? "ready" : "error")} />
            {entity.isActive ? "Active" : "Disposed"}
          </div>
        </div>
      </Section>

      <Section label="Stats">
        <div style={detailsValueStyle}>
          <div>Run count: {entity.runCount}</div>
          <div>Changes: {entity.changeCount}</div>
        </div>
      </Section>

      {entity.dependencyIds.length > 0 && (
        <Section label="Dependencies">
          <div style={codeBlockStyle}>
            {entity.dependencyIds.map((id) => (
              <div key={id}>{id}</div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

/**
 * Pool entry item component.
 */
function PoolEntryItem({ params, value }: { params: unknown; value: unknown }) {
  return (
    <div
      style={{
        padding: "8px",
        borderBottom: "1px solid var(--atomirx-border)",
      }}
    >
      <div style={{ marginBottom: 4 }}>
        <span
          style={{
            fontSize: "var(--atomirx-font-size-sm)",
            color: "var(--atomirx-text-secondary)",
            marginRight: 6,
          }}
        >
          params:
        </span>
        <span
          style={{
            fontFamily: "var(--atomirx-font-mono)",
            fontSize: "var(--atomirx-font-size)",
            color: "var(--atomirx-info)",
          }}
        >
          {serializeValue(params, 100)}
        </span>
      </div>
      <div>
        <span
          style={{
            fontSize: "var(--atomirx-font-size-sm)",
            color: "var(--atomirx-text-secondary)",
            marginRight: 6,
          }}
        >
          value:
        </span>
        <span
          style={{
            fontFamily: "var(--atomirx-font-mono)",
            fontSize: "var(--atomirx-font-size)",
          }}
        >
          {serializeValue(value, 200)}
        </span>
      </div>
    </div>
  );
}

/**
 * Pool details.
 */
function PoolDetails({ entity }: { entity: PoolEntityInfo }) {
  // Force re-render when pool changes
  const [updateCount, forceUpdate] = useState(0);

  useEffect(() => {
    const instance = entity.instanceRef.deref();
    if (!instance) return;

    const pool = instance as import("../core/types").Pool<unknown, unknown>;
    return pool.on(() => {
      forceUpdate((n) => n + 1);
    });
  }, [entity]);

  const entries = useMemo(() => {
    const instance = entity.instanceRef.deref();
    if (!instance) return [];

    const pool = instance as import("../core/types").Pool<unknown, unknown>;
    const result: Array<{ params: unknown; value: unknown }> = [];
    pool.forEach((value, params) => {
      result.push({ params, value });
    });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity, updateCount]);

  return (
    <>
      <Section label="Config">
        <div style={detailsValueStyle}>
          <div>Entry count: {entries.length}</div>
          <div>GC time: {entity.gcTime}ms</div>
          <div>Changes: {entity.changeCount}</div>
        </div>
      </Section>

      <Section label={`Entries (${entries.length})`}>
        {entries.length === 0 ? (
          <div
            style={{
              color: "var(--atomirx-text-muted)",
              fontStyle: "italic",
              padding: 8,
            }}
          >
            No entries
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "var(--atomirx-bg-tertiary)",
              borderRadius: "var(--atomirx-radius)",
              overflow: "hidden",
            }}
          >
            {entries.map((entry, idx) => (
              <PoolEntryItem
                key={idx}
                params={entry.params}
                value={entry.value}
              />
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

/**
 * Module details.
 */
function ModuleDetails({ entity }: { entity: ModuleEntityInfo }) {
  const instance = entity.instanceRef.deref();
  const keys = instance ? Object.keys(instance) : [];

  return (
    <>
      <Section label="Exports">
        <div style={codeBlockStyle}>
          {keys.length > 0 ? keys.join(", ") : "[empty or disposed]"}
        </div>
      </Section>

      <Section label="Stats">
        <div style={detailsValueStyle}>
          <div>Changes: {entity.changeCount}</div>
        </div>
      </Section>
    </>
  );
}

/**
 * Entity details panel component.
 */
export const EntityDetails = memo(function EntityDetails({
  entity,
  onClose,
}: EntityDetailsProps) {
  const displayName = entity.key || `anonymous-${entity.id.split("-").pop()}`;

  return (
    <div style={detailsPanelStyle}>
      {/* Fixed header */}
      <div
        style={{
          ...detailsHeaderStyle,
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <button style={closeButtonStyle} onClick={onClose} title="Back to list">
          ←
        </button>
        <span style={getTypeBadgeStyle(entity.type)}>
          {entity.type === "mutable"
            ? "M"
            : entity.type === "derived"
              ? "D"
              : entity.type === "pool"
                ? "P"
                : entity.type === "effect"
                  ? "E"
                  : "M"}
        </span>
        <span
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
            fontSize: 12,
          }}
          title={displayName}
        >
          {displayName}
        </span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: "1 1 0", overflow: "auto", minHeight: 0, height: 0 }}>
        <Section label="ID">
          <div
            style={{
              ...detailsValueStyle,
              fontSize: "var(--atomirx-font-size-sm)",
            }}
          >
            {entity.id}
          </div>
        </Section>

        <Section label="Created">
          <div style={detailsValueStyle}>
            {formatTimestamp(entity.createdAt)}
          </div>
        </Section>

        {entity.type === "mutable" && (
          <MutableDetails entity={entity as MutableEntityInfo} />
        )}
        {entity.type === "derived" && (
          <DerivedDetails entity={entity as DerivedEntityInfo} />
        )}
        {entity.type === "effect" && (
          <EffectDetails entity={entity as EffectEntityInfo} />
        )}
        {entity.type === "pool" && (
          <PoolDetails entity={entity as PoolEntityInfo} />
        )}
        {entity.type === "module" && (
          <ModuleDetails entity={entity as ModuleEntityInfo} />
        )}
      </div>
    </div>
  );
});
