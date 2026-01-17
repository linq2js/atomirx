import { onCreateHook } from "./onCreateHook";
import { ModuleMeta } from "./types";

/**
 * A factory function that creates a swappable lazy singleton store.
 *
 * @template TModule The type of the store instance
 */
export interface Define<TModule> {
  readonly key: string | undefined;
  /** Get the current service instance (creates lazily on first call) */
  (): TModule;

  /**
   * Override the service implementation with a lazy factory.
   * Useful for testing, platform-specific implementations, or feature flags.
   * The factory is called lazily on first access after override.
   *
   * **IMPORTANT**: Must be called **before** the service is initialized.
   * Throws an error if called after the service has been accessed.
   *
   * @param factory - Factory function that creates the replacement implementation.
   *                  Receives the original factory as argument for extending.
   *
   * @throws {Error} If called after the service has been initialized
   *
   * @example Full replacement
   * ```ts
   * myService.override(() => ({ value: 'mock' }));
   * ```
   *
   * @example Extend original
   * ```ts
   * myService.override((original) => ({
   *   ...original(),
   *   extraMethod() { ... }
   * }));
   * ```
   */
  override(factory: (original: () => TModule) => TModule): void;

  /**
   * Reset to the original implementation.
   * Clears any override set via `.override()` and disposes the current instance.
   * Next access will create a fresh original instance.
   */
  reset(): void;

  /**
   * Invalidate the cached instance. Next call will create a fresh instance.
   * If the current instance has a `dispose()` method, it will be called before clearing.
   *
   * Unlike `reset()` which only clears overrides, `invalidate()` clears everything
   * so the next access creates a completely fresh instance from the factory.
   */
  invalidate(): void;

  /** Returns true if currently using an overridden implementation via `.override()` */
  isOverridden(): boolean;

  /** Returns true if the lazy instance has been created */
  isInitialized(): boolean;
}

export interface DefineOptions {
  key?: string;
  meta?: ModuleMeta;
}

/**
 * Creates a swappable lazy singleton store.
 *
 * Unlike `once()` from lodash, `define()` allows you to:
 * - Override the implementation at runtime with `.override()`
 * - Reset to the original with `.reset()`
 * - Invalidate and recreate fresh with `.invalidate()`
 *
 * This is useful for:
 * - **Testing** - inject mocks without module mocking
 * - **Platform-specific** - mobile vs web implementations
 * - **Feature flags** - swap implementations at runtime
 *
 * @param creator - Factory function that creates the store instance
 * @returns A callable store with `.override()`, `.reset()`, and `.invalidate()` methods
 *
 * @example Basic usage
 * ```ts
 * const counterStore = define(() => {
 *   const [count, setCount] = atom(0);
 *   return {
 *     count,
 *     increment: () => setCount((c) => c + 1),
 *   };
 * });
 *
 * // Normal usage - lazy singleton
 * const store = counterStore();
 * store.increment();
 * ```
 *
 * @example Platform-specific implementation
 * ```ts
 * const storageStore = define(() => ({
 *   get: (key) => localStorage.getItem(key),
 *   set: (key, value) => localStorage.setItem(key, value),
 * }));
 *
 * // On mobile, swap to secure storage BEFORE first access
 * if (isMobile()) {
 *   storageStore.override(() => ({
 *     get: (key) => SecureStore.getItem(key),
 *     set: (key, value) => SecureStore.setItem(key, value),
 *   }));
 * }
 * ```
 *
 * @example Extending original with extra methods
 * ```ts
 * apiStore.override((original) => ({
 *   ...original(),
 *   mockFetch: vi.fn(),
 * }));
 * ```
 *
 * @example Wrapping original behavior
 * ```ts
 * loggerStore.override((original) => {
 *   const base = original();
 *   return {
 *     ...base,
 *     log: (msg) => {
 *       console.log('[DEBUG]', msg);
 *       base.log(msg);
 *     },
 *   };
 * });
 * ```
 *
 * @example Testing with reset (creates fresh instances)
 * ```ts
 * beforeEach(() => {
 *   counterStore.override(() => ({
 *     count: () => 999,
 *     increment: vi.fn(),
 *   }));
 * });
 *
 * afterEach(() => {
 *   counterStore.reset(); // Clears override, next call creates fresh original
 * });
 * ```
 *
 * @example Testing with invalidate (fresh instance each test)
 * ```ts
 * afterEach(() => {
 *   counterStore.invalidate(); // Next call creates fresh instance
 * });
 *
 * it('test 1', () => {
 *   counterStore().increment(); // count = 1
 * });
 *
 * it('test 2', () => {
 *   // Fresh instance, count starts at 0 again
 *   expect(counterStore().count()).toBe(0);
 * });
 * ```
 *
 * @example Store with dispose cleanup
 * ```ts
 * const connectionStore = define(() => {
 *   const connection = createConnection();
 *   return {
 *     query: (sql) => connection.query(sql),
 *     dispose: () => connection.close(), // Called on invalidate()
 *   };
 * });
 *
 * connectionStore.invalidate(); // Closes connection, next call creates new
 * ```
 */
export function define<T>(
  creator: () => T,
  options?: DefineOptions
): Define<T> {
  let instance: T | undefined;
  let overrideFactory: ((original: () => T) => T) | undefined;

  const tryDispose = (target: T | undefined) => {
    if (
      target &&
      typeof target === "object" &&
      "dispose" in target &&
      typeof target.dispose === "function"
    ) {
      target.dispose();
    }
  };

  const clearInstance = () => {
    tryDispose(instance);
    instance = undefined;
  };

  const get = (): T => {
    if (!instance) {
      if (overrideFactory) {
        instance = overrideFactory!(creator);
      } else {
        instance = creator();
      }
      onCreateHook.current?.({
        type: "module",
        key: options?.key,
        meta: options?.meta,
        module: instance,
      });
    }
    return instance;
  };

  return Object.assign(get, {
    key: options?.key,
    override: (factory: (original: () => T) => T) => {
      if (instance !== undefined) {
        throw new Error(
          "Cannot override after initialization. Call override() before accessing the service."
        );
      }
      overrideFactory = factory;
    },
    reset: () => {
      overrideFactory = undefined;
      clearInstance();
    },
    invalidate: () => {
      overrideFactory = undefined;
      clearInstance();
    },
    isOverridden: () => overrideFactory !== undefined,
    isInitialized: () => instance !== undefined,
  });
}
