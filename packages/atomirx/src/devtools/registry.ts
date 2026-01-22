import {
  EntityInfo,
  EntityType,
  DevtoolsRegistry,
  DevtoolsStats,
  ChangeHistoryEntry,
  MutableEntityInfo,
  DerivedEntityInfo,
  EffectEntityInfo,
  PoolEntityInfo,
  ModuleEntityInfo,
} from "./types";
import { DEFAULT_MAX_HISTORY_SIZE, ENTITY_ID_PREFIX } from "./constants";
import type { MutableAtom, DerivedAtom, Pool } from "../core/types";
import type { Effect } from "../core/effect";

/**
 * Counter for generating unique entity IDs.
 */
let entityIdCounter = 0;

/**
 * Generate a unique entity ID.
 */
export function generateEntityId(type: EntityType): string {
  return `${ENTITY_ID_PREFIX}-${type}-${++entityIdCounter}`;
}

/**
 * Internal registry implementation.
 */
class DevtoolsRegistryImpl implements DevtoolsRegistry {
  private _entities = new Map<string, EntityInfo>();
  private _listeners = new Set<() => void>();
  private _maxHistorySize: number;

  constructor(maxHistorySize: number = DEFAULT_MAX_HISTORY_SIZE) {
    this._maxHistorySize = maxHistorySize;
  }

  get entities(): ReadonlyMap<string, EntityInfo> {
    return this._entities;
  }

  /**
   * Register a mutable atom.
   */
  registerMutable(
    instance: MutableAtom<unknown>,
    key: string | undefined
  ): string {
    const id = generateEntityId("mutable");
    const now = Date.now();

    const info: MutableEntityInfo = {
      id,
      type: "mutable",
      key,
      createdAt: now,
      lastUpdatedAt: now,
      changeCount: 0,
      instanceRef: new WeakRef(instance),
      subscriberCount: 0,
      history: [],
    };

    this._entities.set(id, info);
    this._notifyListeners();

    // Track value changes
    this._trackMutableChanges(id, instance);

    return id;
  }

  /**
   * Register a derived atom.
   */
  registerDerived(
    instance: DerivedAtom<unknown, boolean>,
    key: string | undefined,
    dependencyIds: string[] = []
  ): string {
    const id = generateEntityId("derived");
    const now = Date.now();

    const info: DerivedEntityInfo = {
      id,
      type: "derived",
      key,
      createdAt: now,
      lastUpdatedAt: now,
      changeCount: 0,
      instanceRef: new WeakRef(instance),
      dependencyIds,
      subscriberCount: 0,
      history: [],
    };

    this._entities.set(id, info);
    this._notifyListeners();

    // Track value changes
    this._trackDerivedChanges(id, instance);

    return id;
  }

  /**
   * Register an effect.
   */
  registerEffect(
    instance: Effect,
    key: string | undefined,
    dependencyIds: string[] = []
  ): string {
    const id = generateEntityId("effect");
    const now = Date.now();

    const info: EffectEntityInfo = {
      id,
      type: "effect",
      key,
      createdAt: now,
      lastUpdatedAt: now,
      changeCount: 0,
      instanceRef: new WeakRef(instance),
      dependencyIds,
      runCount: 0,
      isActive: true,
    };

    this._entities.set(id, info);
    this._notifyListeners();

    return id;
  }

  /**
   * Register a pool.
   */
  registerPool(
    instance: Pool<unknown, unknown>,
    key: string | undefined,
    gcTime: number
  ): string {
    const id = generateEntityId("pool");
    const now = Date.now();

    const info: PoolEntityInfo = {
      id,
      type: "pool",
      key,
      createdAt: now,
      lastUpdatedAt: now,
      changeCount: 0,
      instanceRef: new WeakRef(instance),
      entryCount: 0,
      gcTime,
    };

    this._entities.set(id, info);
    this._notifyListeners();

    // Track pool changes
    this._trackPoolChanges(id, instance);

    return id;
  }

  /**
   * Register a module.
   */
  registerModule(instance: object, key: string | undefined): string {
    const id = generateEntityId("module");
    const now = Date.now();

    const info: ModuleEntityInfo = {
      id,
      type: "module",
      key,
      createdAt: now,
      lastUpdatedAt: now,
      changeCount: 0,
      instanceRef: new WeakRef(instance),
    };

    this._entities.set(id, info);
    this._notifyListeners();

    return id;
  }

  /**
   * Track changes to a mutable atom.
   */
  private _trackMutableChanges(id: string, instance: MutableAtom<unknown>): void {
    let previousValue = this._serializeValue(instance.get());

    instance.on(() => {
      const info = this._entities.get(id) as MutableEntityInfo | undefined;
      if (!info) return;

      const newValue = this._serializeValue(instance.get());
      const now = Date.now();

      // Add to history
      const historyEntry: ChangeHistoryEntry = {
        timestamp: now,
        previousValue,
        newValue,
      };

      info.history = [historyEntry, ...info.history].slice(0, this._maxHistorySize);
      info.changeCount++;
      info.lastUpdatedAt = now;
      previousValue = newValue;

      this._notifyListeners();
    });
  }

  /**
   * Track changes to a derived atom.
   */
  private _trackDerivedChanges(
    id: string,
    instance: DerivedAtom<unknown, boolean>
  ): void {
    let previousValue = this._serializeValue(instance.staleValue);

    instance.on(() => {
      const info = this._entities.get(id) as DerivedEntityInfo | undefined;
      if (!info) return;

      const newValue = this._serializeValue(instance.staleValue);
      const now = Date.now();

      // Add to history
      const historyEntry: ChangeHistoryEntry = {
        timestamp: now,
        previousValue,
        newValue,
      };

      info.history = [historyEntry, ...info.history].slice(0, this._maxHistorySize);
      info.changeCount++;
      info.lastUpdatedAt = now;
      previousValue = newValue;

      this._notifyListeners();
    });
  }

  /**
   * Track changes to a pool.
   */
  private _trackPoolChanges(
    id: string,
    instance: Pool<unknown, unknown>
  ): void {
    // Track entry changes
    instance.onChange(() => {
      const info = this._entities.get(id) as PoolEntityInfo | undefined;
      if (!info) return;

      info.changeCount++;
      info.lastUpdatedAt = Date.now();
      this._updatePoolEntryCount(id, instance);
      this._notifyListeners();
    });

    // Track removals
    instance.onRemove(() => {
      this._updatePoolEntryCount(id, instance);
      this._notifyListeners();
    });
  }

  /**
   * Update pool entry count.
   */
  private _updatePoolEntryCount(
    id: string,
    instance: Pool<unknown, unknown>
  ): void {
    const info = this._entities.get(id) as PoolEntityInfo | undefined;
    if (!info) return;

    let count = 0;
    instance.forEach(() => count++);
    info.entryCount = count;
  }

  /**
   * Serialize a value for history storage.
   */
  private _serializeValue(value: unknown): string {
    if (value === undefined) return "undefined";
    if (value === null) return "null";

    try {
      const seen = new WeakSet();
      return JSON.stringify(
        value,
        (_key, val) => {
          if (typeof val === "object" && val !== null) {
            if (seen.has(val)) return "[Circular]";
            seen.add(val);
          }
          if (typeof val === "function") return "[Function]";
          if (typeof val === "symbol") return val.toString();
          if (val instanceof Error) return `[Error: ${val.message}]`;
          if (val instanceof Promise) return "[Promise]";
          return val;
        },
        2
      );
    } catch {
      return "[unserializable]";
    }
  }

  getByType<T extends EntityType>(type: T): EntityInfo[] {
    const result: EntityInfo[] = [];
    for (const entity of this._entities.values()) {
      if (entity.type === type) {
        result.push(entity);
      }
    }
    return result;
  }

  get(id: string): EntityInfo | undefined {
    return this._entities.get(id);
  }

  subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  getStats(): DevtoolsStats {
    let mutableCount = 0;
    let derivedCount = 0;
    let effectCount = 0;
    let poolCount = 0;
    let moduleCount = 0;

    for (const entity of this._entities.values()) {
      switch (entity.type) {
        case "mutable":
          mutableCount++;
          break;
        case "derived":
          derivedCount++;
          break;
        case "effect":
          effectCount++;
          break;
        case "pool":
          poolCount++;
          break;
        case "module":
          moduleCount++;
          break;
      }
    }

    return {
      mutableCount,
      derivedCount,
      effectCount,
      poolCount,
      moduleCount,
      totalCount:
        mutableCount + derivedCount + effectCount + poolCount + moduleCount,
    };
  }

  clear(): void {
    this._entities.clear();
    this._notifyListeners();
  }

  private _notifyListeners(): void {
    for (const listener of this._listeners) {
      try {
        listener();
      } catch {
        // Ignore listener errors
      }
    }
  }
}

/**
 * Global registry instance.
 */
let globalRegistry: DevtoolsRegistryImpl | null = null;

/**
 * Get or create the global devtools registry.
 */
export function getRegistry(
  maxHistorySize?: number
): DevtoolsRegistryImpl {
  if (!globalRegistry) {
    globalRegistry = new DevtoolsRegistryImpl(maxHistorySize);
  }
  return globalRegistry;
}

/**
 * Reset the global registry (for testing).
 * Note: This also resets the isEnabled state in setup.ts
 */
export function resetRegistry(): void {
  globalRegistry?.clear();
  globalRegistry = null;
}

/**
 * Force set the global registry to null (for testing).
 * @internal
 */
export function _forceResetRegistry(): void {
  globalRegistry = null;
}
