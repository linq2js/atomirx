import { memo, useCallback, useMemo } from "react";
import type {
  EntityInfo,
  DevtoolsTab,
  AtomFilter,
  DerivedEntityInfo,
} from "../devtools/types";
import {
  entityListStyle,
  getEntityItemStyle,
  getTypeBadgeStyle,
  entityKeyStyle,
  entityValueStyle,
  emptyStateStyle,
} from "./styles";
import { serializeValue, formatRelativeTime } from "./hooks";

interface EntityListProps {
  entities: ReadonlyMap<string, EntityInfo>;
  activeTab: DevtoolsTab;
  searchText: string;
  atomFilter: AtomFilter;
  selectedEntityId: string | null;
  onSelectEntity: (id: string | null) => void;
  showValues: boolean;
}

/**
 * Get preview value for an entity.
 * @param entity - The entity to get preview for
 * @param showValues - If false, returns placeholder for atoms to avoid triggering lazy computation
 */
function getEntityPreview(entity: EntityInfo, showValues: boolean): string {
  const instance = entity.instanceRef.deref();
  if (!instance) return "[disposed]";

  switch (entity.type) {
    case "mutable": {
      if (!showValues) return "—";
      const atom = instance as import("../core/types").MutableAtom<unknown>;
      return serializeValue(atom.get(), 50);
    }
    case "derived": {
      if (!showValues) return "—";
      const derived = instance as import("../core/types").DerivedAtom<
        unknown,
        boolean
      >;
      return serializeValue(derived.staleValue, 50);
    }
    case "effect":
      return `runs: ${(entity as import("../devtools/types").EffectEntityInfo).runCount}`;
    case "pool":
      return `entries: ${(entity as import("../devtools/types").PoolEntityInfo).entryCount}`;
    case "module":
      return "[module]";
    default:
      return "";
  }
}

/**
 * Get status for derived atoms.
 */
function getDerivedStatus(
  entity: DerivedEntityInfo
): "ready" | "loading" | "error" {
  const instance = entity.instanceRef.deref();
  if (!instance) return "error";

  const state = instance.state();
  return state.status;
}

/**
 * Entity list item component.
 */
const EntityItem = memo(function EntityItem({
  entity,
  isSelected,
  onClick,
  showValues,
}: {
  entity: EntityInfo;
  isSelected: boolean;
  onClick: () => void;
  showValues: boolean;
}) {
  const preview = useMemo(
    () => getEntityPreview(entity, showValues),
    [entity, showValues]
  );
  const displayName = entity.key || `anonymous-${entity.id.split("-").pop()}`;

  return (
    <div
      style={getEntityItemStyle(isSelected)}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLDivElement).style.backgroundColor =
            "var(--atomirx-bg-hover)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLDivElement).style.backgroundColor =
            "transparent";
        }
      }}
    >
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
          ...entityKeyStyle,
          ...(entity.type === "derived" && {
            color:
              getDerivedStatus(entity as DerivedEntityInfo) === "ready"
                ? "var(--atomirx-success)"
                : getDerivedStatus(entity as DerivedEntityInfo) === "loading"
                  ? "var(--atomirx-warning)"
                  : getDerivedStatus(entity as DerivedEntityInfo) === "error"
                    ? "var(--atomirx-error)"
                    : undefined,
          }),
        }}
        title={displayName}
      >
        {displayName}
      </span>
      <span style={entityValueStyle} title={preview}>
        {preview}
      </span>
      <span
        style={{
          color: "var(--atomirx-text-muted)",
          fontSize: "var(--atomirx-font-size-sm)",
          flexShrink: 0,
        }}
      >
        {formatRelativeTime(entity.lastUpdatedAt)}
      </span>
    </div>
  );
});

/**
 * Entity list component with filtering and search.
 */
export const EntityList = memo(function EntityList({
  entities,
  activeTab,
  searchText,
  atomFilter,
  selectedEntityId,
  onSelectEntity,
  showValues,
}: EntityListProps) {
  // Filter entities by tab and search
  const filteredEntities = useMemo(() => {
    const result: EntityInfo[] = [];
    const searchLower = searchText.toLowerCase();

    for (const entity of entities.values()) {
      // Filter by tab
      switch (activeTab) {
        case "atoms":
          if (entity.type !== "mutable" && entity.type !== "derived") continue;
          // Apply atom filter
          if (atomFilter === "mutable" && entity.type !== "mutable") continue;
          if (atomFilter === "derived" && entity.type !== "derived") continue;
          break;
        case "effects":
          if (entity.type !== "effect") continue;
          break;
        case "pools":
          if (entity.type !== "pool") continue;
          break;
        case "modules":
          if (entity.type !== "module") continue;
          break;
      }

      // Filter by search
      if (searchText) {
        const keyMatch = entity.key?.toLowerCase().includes(searchLower);
        const idMatch = entity.id.toLowerCase().includes(searchLower);
        if (!keyMatch && !idMatch) continue;
      }

      result.push(entity);
    }

    // Sort by last updated (newest first)
    result.sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt);

    return result;
  }, [entities, activeTab, searchText, atomFilter]);

  const handleSelect = useCallback(
    (id: string) => {
      onSelectEntity(selectedEntityId === id ? null : id);
    },
    [selectedEntityId, onSelectEntity]
  );

  if (filteredEntities.length === 0) {
    return (
      <div style={emptyStateStyle}>
        {searchText
          ? `No ${activeTab} matching "${searchText}"`
          : `No ${activeTab} registered`}
      </div>
    );
  }

  return (
    <div style={entityListStyle}>
      {filteredEntities.map((entity) => (
        <EntityItem
          key={entity.id}
          entity={entity}
          isSelected={entity.id === selectedEntityId}
          onClick={() => handleSelect(entity.id)}
          showValues={showValues}
        />
      ))}
    </div>
  );
});
