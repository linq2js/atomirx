import { useRef } from "react";
import {
  resolveEquality,
  tryStabilize,
  StableFn,
  shallowEqual,
  deepEqual,
} from "../core/equality";
import type { AnyFunc, Equality } from "../core/types";

/**
 * Extracts non-function keys from an object type.
 */
type NonFunctionKeys<T> = {
  [K in keyof T]: T[K] extends AnyFunc ? never : K;
}[keyof T];

/**
 * Equals options for useStable - only non-function properties can have custom equality.
 */
export type UseStableEquals<T> = {
  [K in NonFunctionKeys<T>]?: Equality<T[K]>;
};

/**
 * Result type for useStable - functions are wrapped in StableFn.
 */
export type UseStableResult<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? StableFn<A, R>
    : T[K];
};

/**
 * Storage for each property's previous value.
 */
type PropertyStorage<T> = {
  [K in keyof T]?: { value: T[K] };
};

/**
 * Determines the default equality strategy based on value type.
 *
 * - Array → 'shallow' (compare items by reference)
 * - Date → handled specially in tryStabilize (timestamp comparison)
 * - Object → 'shallow' (compare keys by reference)
 * - Primitives → 'strict' (reference equality)
 */
function getDefaultEquality<T>(value: T): Equality<T> {
  if (value === null || value === undefined) {
    return Object.is;
  }

  if (Array.isArray(value)) {
    return "shallow";
  }

  if (value instanceof Date) {
    // Date is handled specially in tryStabilize, but we return deep
    // to ensure proper comparison if tryStabilize doesn't catch it
    return deepEqual;
  }

  if (typeof value === "object") {
    return shallowEqual;
  }

  return Object.is;
}

/**
 * React hook that provides stable references for objects, arrays, and callbacks.
 *
 * `useStable` solves the common React problem of unstable references causing
 * unnecessary re-renders, useEffect re-runs, and useCallback/useMemo invalidations.
 *
 * ## Why Use `useStable`?
 *
 * In React, inline objects, arrays, and callbacks create new references on every render:
 *
 * ```tsx
 * // ❌ Problem: new reference every render
 * function Parent() {
 *   const config = { theme: 'dark' };  // New object every render!
 *   const onClick = () => doSomething(); // New function every render!
 *   return <Child config={config} onClick={onClick} />;
 * }
 *
 * // ✅ Solution: stable references
 * function Parent() {
 *   const stable = useStable({
 *     config: { theme: 'dark' },
 *     onClick: () => doSomething(),
 *   });
 *   return <Child config={stable.config} onClick={stable.onClick} />;
 * }
 * ```
 *
 * ## How It Works
 *
 * Each property is independently stabilized based on its type:
 *
 * | Type | Default Equality | Behavior |
 * |------|------------------|----------|
 * | **Functions** | N/A (always wrapped) | Reference never changes, calls latest implementation |
 * | **Arrays** | shallow | Stable if items are reference-equal |
 * | **Dates** | timestamp | Stable if same time value |
 * | **Objects** | shallow | Stable if keys have reference-equal values |
 * | **Primitives** | strict | Stable if same value |
 *
 * ## Key Benefits
 *
 * 1. **Stable callbacks**: Functions maintain reference identity while always calling latest implementation
 * 2. **Stable objects/arrays**: Prevent unnecessary child re-renders
 * 3. **Safe for deps arrays**: Use in useEffect, useMemo, useCallback deps
 * 4. **Per-property equality**: Customize comparison strategy for each property
 * 5. **No wrapper overhead**: Returns the same result object reference
 *
 * @template T - The type of the input object
 * @param input - Object with properties to stabilize
 * @param equals - Optional custom equality strategies per property (except functions)
 * @returns Stable object with same properties (functions wrapped in StableFn)
 *
 * @example Basic usage - stable callbacks and objects
 * ```tsx
 * function MyComponent({ userId }) {
 *   const stable = useStable({
 *     // Object - stable if shallow equal
 *     config: { theme: 'dark', userId },
 *     // Array - stable if items are reference-equal
 *     items: [1, 2, 3],
 *     // Function - reference never changes
 *     onClick: () => console.log('clicked', userId),
 *   });
 *
 *   // Safe to use in deps - won't cause infinite loops
 *   useEffect(() => {
 *     console.log(stable.config);
 *   }, [stable.config]);
 *
 *   // stable.onClick is always the same reference
 *   return <button onClick={stable.onClick}>Click</button>;
 * }
 * ```
 *
 * @example Preventing child re-renders
 * ```tsx
 * function Parent() {
 *   const [count, setCount] = useState(0);
 *
 *   const stable = useStable({
 *     // These won't cause Child to re-render when count changes
 *     user: { id: 1, name: 'John' },
 *     onSave: () => saveUser(),
 *   });
 *
 *   return (
 *     <div>
 *       <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
 *       <MemoizedChild user={stable.user} onSave={stable.onSave} />
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Custom equality per property
 * ```tsx
 * const stable = useStable(
 *   {
 *     user: { id: 1, profile: { name: "John", avatar: "..." } },
 *     tags: ["react", "typescript"],
 *     settings: { theme: "dark" },
 *   },
 *   {
 *     user: "deep",              // Deep compare nested objects
 *     tags: "strict",            // Override default shallow for arrays
 *     settings: "shallow",       // Explicit shallow (same as default)
 *   }
 * );
 * ```
 *
 * @example Custom equality function
 * ```tsx
 * const stable = useStable(
 *   { user: { id: 1, name: "John", updatedAt: new Date() } },
 *   {
 *     // Only compare by id - ignore name and updatedAt changes
 *     user: (a, b) => a?.id === b?.id
 *   }
 * );
 * // stable.user reference only changes when id changes
 * ```
 *
 * @example With useEffect deps
 * ```tsx
 * function DataFetcher({ filters }) {
 *   const stable = useStable({
 *     filters: { ...filters, timestamp: Date.now() },
 *     onSuccess: (data) => processData(data),
 *   });
 *
 *   useEffect(() => {
 *     // Only re-runs when filters actually change (shallow comparison)
 *     fetchData(stable.filters).then(stable.onSuccess);
 *   }, [stable.filters, stable.onSuccess]);
 * }
 * ```
 *
 * @example Stable event handlers for lists
 * ```tsx
 * function TodoList({ todos }) {
 *   const stable = useStable({
 *     onDelete: (id) => deleteTodo(id),
 *     onToggle: (id) => toggleTodo(id),
 *   });
 *
 *   return (
 *     <ul>
 *       {todos.map(todo => (
 *         <TodoItem
 *           key={todo.id}
 *           todo={todo}
 *           onDelete={stable.onDelete}  // Same reference for all items
 *           onToggle={stable.onToggle}  // Prevents unnecessary re-renders
 *         />
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useStable<T extends Record<string, unknown>>(
  input: T,
  equals?: UseStableEquals<T>
): UseStableResult<T> {
  // Store previous values for each property
  const storageRef = useRef<PropertyStorage<T>>({});

  // Store the stable result object (reference never changes)
  const resultRef = useRef<UseStableResult<T> | null>(null);

  // Initialize result object on first render
  if (resultRef.current === null) {
    resultRef.current = {} as UseStableResult<T>;
  }

  const storage = storageRef.current;
  const result = resultRef.current;

  // Process each property
  for (const key of Object.keys(input) as (keyof T)[]) {
    const nextValue = input[key];
    const prevStorage = storage[key];

    // Functions are always stabilized, ignore equality option
    if (typeof nextValue === "function") {
      const [stabilized] = tryStabilize(
        prevStorage as { value: AnyFunc } | undefined,
        nextValue as AnyFunc,
        () => false // Equality doesn't matter for functions
      );

      storage[key] = { value: stabilized as T[typeof key] };
      (result as Record<keyof T, unknown>)[key] = stabilized;
      continue;
    }

    // Get equality function for this property
    const customEquals = equals?.[key as NonFunctionKeys<T>];
    const equalityFn = customEquals
      ? resolveEquality(customEquals as Equality<T[typeof key]>)
      : resolveEquality(getDefaultEquality(nextValue));

    // Stabilize the value
    const [stabilized] = tryStabilize(
      prevStorage,
      nextValue,
      equalityFn as (a: T[typeof key], b: T[typeof key]) => boolean
    );

    storage[key] = { value: stabilized };
    (result as Record<keyof T, unknown>)[key] = stabilized;
  }

  // Handle removed properties (set to undefined)
  for (const key of Object.keys(storage) as (keyof T)[]) {
    if (!(key in input)) {
      delete storage[key];
      delete (result as Record<keyof T, unknown>)[key];
    }
  }

  return result;
}
