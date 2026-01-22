# API Reference

Complete API documentation for atomirx.

## Table of Contents

- [Core](#core)
  - [atom](#atom)
  - [derived](#derived)
  - [effect](#effect)
  - [pool](#pool)
  - [batch](#batch)
  - [define](#define)
  - [readonly](#readonly)
  - [select](#select)
  - [emitter](#emitter)
- [React](#react)
  - [useSelector](#useselector)
  - [rx](#rx)
  - [useAction](#useaction)
  - [useStable](#usestable)
- [Promise Utilities](#promise-utilities)
  - [trackPromise](#trackpromise)
  - [isPending](#ispending)
  - [isFulfilled](#isfulfilled)
  - [isRejected](#isrejected)
  - [unwrap](#unwrap)
- [Type Guards](#type-guards)
  - [isAtom](#isatom)
  - [isDerived](#isderived)
  - [isPool](#ispool)
  - [isVirtualAtom](#isvirtualatom)
- [Hooks](#hooks)
  - [onCreateHook](#oncreatehook)
  - [onErrorHook](#onerrorhook)
- [Types](#types)

---

## Core

### atom

Creates a mutable atom - a reactive state container.

```ts
function atom<T>(
  valueOrInit: T | ((context: AtomContext) => T),
  options?: AtomOptions<T>
): MutableAtom<T>
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `valueOrInit` | `T \| (context) => T` | Initial value or lazy initializer |
| `options.meta` | `AtomMeta` | Metadata for debugging |
| `options.equals` | `Equality<T>` | Equality function |

#### AtomContext

| Property | Type | Description |
|----------|------|-------------|
| `signal` | `AbortSignal` | Aborted on value change/reset |
| `onCleanup` | `(fn) => void` | Register cleanup function |

#### MutableAtom<T>

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `get()` | `T` | Get current value |
| `set(value)` | `void` | Set new value |
| `set(reducer)` | `void` | Update via reducer |
| `reset()` | `void` | Reset to initial value |
| `dirty()` | `boolean` | Has value changed since init/reset |
| `on(listener)` | `() => void` | Subscribe, returns unsubscribe |
| `meta` | `AtomMeta \| undefined` | Metadata |

#### Example

```ts
const count$ = atom(0);
const user$ = atom({ name: 'John' }, { equals: 'shallow' });
const timestamp$ = atom(() => Date.now());
```

---

### derived

Creates a computed atom from source atoms.

```ts
function derived<T>(
  fn: (context: DerivedContext) => T,
  options?: DerivedOptions<T>
): DerivedAtom<T, false>

function derived<T>(
  fn: (context: DerivedContext) => T,
  options: DerivedOptions<T> & { fallback: T }
): DerivedAtom<T, true>
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `fn` | `(context) => T` | Selector function (must be sync) |
| `options.meta` | `DerivedAtomMeta` | Metadata |
| `options.equals` | `Equality<T>` | Equality function |
| `options.fallback` | `T` | Fallback value |
| `options.onError` | `(error) => void` | Error callback |

#### DerivedAtom<T, F>

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `get()` | `Promise<T>` | Get computed value |
| `staleValue` | `F ? T : T \| undefined` | Cached/fallback value |
| `state()` | `AtomState<T>` | Current state |
| `refresh()` | `void` | Force recomputation |
| `on(listener)` | `() => void` | Subscribe |
| `meta` | `DerivedAtomMeta \| undefined` | Metadata |

#### Example

```ts
const doubled$ = derived(({ read }) => read(count$) * 2);
const safe$ = derived(({ read }) => read(data$), { fallback: [] });
```

---

### effect

Creates a side effect that runs when dependencies change.

```ts
function effect(
  fn: (context: EffectContext) => void,
  options?: EffectOptions
): Effect
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `fn` | `(context) => void` | Effect function (must be sync) |
| `options.meta` | `EffectMeta` | Metadata |
| `options.onError` | `(error) => void` | Error callback |

#### EffectContext

Extends SelectContext with:

| Property | Type | Description |
|----------|------|-------------|
| `onCleanup` | `(fn) => void` | Register cleanup function |
| `signal` | `AbortSignal` | Aborted on re-run or dispose |
| `abort` | `() => void` | Manually trigger abort |

#### Effect

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `dispose()` | `void` | Stop effect and run cleanup |
| `meta` | `EffectMeta \| undefined` | Metadata |

#### Example

```ts
const dispose = effect(({ read, onCleanup }) => {
  const count = read(count$); // Read synchronously
  console.log("Count changed:", count);
  onCleanup(() => console.log("Cleanup"));
});

// With AbortSignal for fetch cancellation
effect(({ read, signal }) => {
  const id = read(userId$);
  fetch(`/api/users/${id}`, { signal })
    .then(r => r.json())
    .then(user => user$.set(user));
});
```

---

### pool

Creates a parameterized collection of atoms with GC.

```ts
function pool<T, P = unknown>(
  init: (params: P, context: AtomContext) => T,
  options: PoolOptions<P>
): Pool<P, T>
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `init` | `(params, context) => T` | Factory function |
| `options.gcTime` | `number` | GC timeout in ms |
| `options.meta` | `PoolMeta` | Metadata |
| `options.equals` | `Equality<P>` | Params equality (default: shallow) |

#### Pool<P, T>

| Method | Type | Description |
|--------|------|-------------|
| `get(params)` | `T` | Get value (creates if needed) |
| `set(params, value)` | `void` | Set value |
| `has(params)` | `boolean` | Check existence |
| `remove(params)` | `void` | Remove entry (aborts signal, runs cleanup) |
| `clear()` | `void` | Remove all entries |
| `forEach(callback)` | `void` | Iterate entries |
| `onChange(listener)` | `() => void` | Subscribe to changes |
| `onRemove(listener)` | `() => void` | Subscribe to removals |

#### Example

```ts
const userPool = pool(
  (id: string) => fetchUser(id),
  { gcTime: 60_000 }
);
```

---

### batch

Batches multiple updates into single notification.

```ts
function batch<T>(fn: () => T): T
```

#### Example

```ts
batch(() => {
  a$.set(1);
  b$.set(2);
}); // Single notification
```

---

### define

Creates a swappable lazy singleton.

```ts
function define<T>(
  creator: () => T,
  options?: DefineOptions
): Define<T>
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `creator` | `() => T` | Factory function |
| `options.key` | `string` | Identifier |
| `options.meta` | `ModuleMeta` | Metadata |

#### Define<T>

| Method | Type | Description |
|--------|------|-------------|
| `()` | `T` | Get instance |
| `override(factory)` | `void` | Override implementation |
| `reset()` | `void` | Clear override and instance |
| `invalidate()` | `void` | Clear instance |
| `isOverridden()` | `boolean` | Has override |
| `isInitialized()` | `boolean` | Has instance |
| `key` | `string \| undefined` | Identifier |

#### Example

```ts
const counterModule = define(() => {
  const count$ = atom(0);
  return { count$, increment: () => count$.set(c => c + 1) };
});
```

---

### readonly

Type utility to expose atom as read-only.

```ts
function readonly<T extends Atom<any>>(atom: T): Atom<AtomValue<T>>
function readonly<T extends Record<string, Atom<any>>>(atoms: T): { [K in keyof T]: Atom<AtomValue<T[K]>> }
```

#### Example

```ts
const count$ = atom(0);
export const publicCount$ = readonly(count$); // Atom<number>, no set()
```

---

### select

Runs a selector outside React.

```ts
function select<T>(
  selector: (context: SelectContext) => T
): { value?: T; result: SelectResult<T> }
```

#### SelectContext

| Method | Type | Description |
|--------|------|-------------|
| `read(atom)` | `Awaited<T>` | Read atom value |
| `from(pool, params)` | `VirtualAtom<T>` | Get pool entry |
| `all(atoms)` | `Awaited<T>[]` | Wait for all |
| `race(atoms)` | `KeyedResult` | First settled |
| `any(atoms)` | `KeyedResult` | First success |
| `settled(atoms)` | `SettledResult<T>[]` | All with status |
| `safe(fn)` | `[Error?, T?]` | Safe error handling |
| `state(atom)` | `SelectStateResult<T>` | Get atom state |
| `and(conditions)` | `boolean` | Logical AND |
| `or(conditions)` | `boolean` | Logical OR |

#### and() / or() - Boolean Operators

Logical AND and OR operators with short-circuit evaluation. Accept an array of conditions.

```ts
type Condition =
  | boolean                         // Static value (no subscription)
  | Atom<unknown>                   // Always read & subscribed
  | (() => boolean | Atom<unknown>) // Lazy (only evaluated if needed)
```

##### and()

Returns `true` if ALL conditions are truthy. Short-circuits on first falsy value.

```ts
// All must be truthy
const canAccess = and([isLoggedIn$, hasPermission$, isActive$]);

// With lazy evaluation (only check permission if logged in)
const canDelete = and([
  isLoggedIn$,           // Always checked
  () => hasDeleteRole$,  // Only checked if logged in
]);

// With static config
const enabled = and([FEATURE_FLAG, isLoggedIn$, () => hasLicense$]);
```

##### or()

Returns `true` if ANY condition is truthy. Short-circuits on first truthy value.

```ts
// Any truthy is enough
const hasData = or([cacheData$, apiData$, fallbackData$]);

// With lazy fallback chain
const result = or([
  () => primarySource$,   // Try primary first
  () => secondarySource$, // Only if primary is falsy
  () => fallbackSource$,  // Last resort
]);
```

##### Composition

Since `and()` and `or()` return booleans, they can be nested:

```ts
// (A && B) || C
const result1 = or([and([a$, b$]), c$]);

// A || (B && C)
const result2 = or([a$, and([b$, c$])]);

// Complex: feature && logged in && (has permission || is admin)
const canAccess = and([
  FEATURE_ENABLED,
  isLoggedIn$,
  or([hasPermission$, isAdmin$]),
]);

// With lazy branches
const result = and([
  quickCheck$,
  () => or([cachedResult$, () => expensiveCheck$]),
]);

---

### emitter

Creates an event emitter.

```ts
function emitter<T = void>(): Emitter<T>
```

#### Emitter<T>

| Method | Type | Description |
|--------|------|-------------|
| `on(listener)` | `() => void` | Subscribe |
| `emit(value)` | `void` | Emit event |
| `forEach(fn)` | `void` | Iterate listeners |
| `emitAndClear()` | `void` | Emit and clear all |

---

## React

### useSelector

React hook for subscribing to atoms.

```ts
function useSelector<T>(atom: Atom<T>, equals?: Equality<T>): Awaited<T>
function useSelector<T>(selector: (context: SelectContext) => T, equals?: Equality<T>): T
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `selectorOrAtom` | `Atom<T> \| (context) => T` | Atom or selector |
| `equals` | `Equality<T>` | Equality function (default: shallow) |

#### Example

```tsx
const count = useSelector(count$);
const doubled = useSelector(({ read }) => read(count$) * 2);
```

---

### rx

Inline reactive component.

```ts
function rx<T extends ReactNode>(
  atom: Atom<T>,
  options?: Equality<T> | RxOptions<T>
): ReactElement

function rx<T extends ReactNode>(
  selector: (context: SelectContext) => T,
  options?: Equality<T> | RxOptions<T>
): ReactElement
```

#### RxOptions<T>

| Property | Type | Description |
|----------|------|-------------|
| `equals` | `Equality<T>` | Equality function |
| `loading` | `() => ReactNode` | Loading fallback |
| `error` | `({ error }) => ReactNode` | Error fallback |
| `deps` | `unknown[]` | Memoization dependencies |

#### Example

```tsx
{rx(count$)}
{rx(({ read }) => read(count$) * 2)}
{rx(asyncAtom$, { loading: () => <Spinner /> })}
```

---

### useAction

Hook for async operations with state tracking.

```ts
function useAction<T, Args extends any[]>(
  action: (context: ActionContext, ...args: Args) => Promise<T>,
  options?: UseActionOptions<T>
): [(...args: Args) => AbortablePromise<T>, ActionState<T>, () => void]
```

#### ActionContext

| Property | Type | Description |
|----------|------|-------------|
| `signal` | `AbortSignal` | Cancellation signal |

#### UseActionOptions<T>

| Property | Type | Description |
|----------|------|-------------|
| `onSuccess` | `(data: T) => void` | Success callback |
| `onError` | `(error: Error) => void` | Error callback |
| `resetOnSuccess` | `number` | Reset delay (ms) |
| `resetOnError` | `number` | Reset delay (ms) |

#### ActionState<T>

```ts
type ActionState<T> = 
  | { status: 'idle' }
  | { status: 'loading'; promise: Promise<T> }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error }
```

#### Example

```tsx
const [save, state, cancel] = useAction(
  async ({ signal }, data) => api.save(data, { signal }),
  { onSuccess: () => toast('Saved!') }
);
```

---

### useStable

Utilities for stable references.

```ts
useStable.fn<T extends Function>(fn: T): T
useStable.obj<T extends object>(obj: T): T
```

#### Example

```tsx
const handleClick = useStable.fn(() => onClick(data));
const config = useStable.obj({ timeout: 5000 });
```

---

## Promise Utilities

### trackPromise

Tracks promise state.

```ts
function trackPromise<T>(promise: PromiseLike<T>): PromiseState<T>
```

### isPending

```ts
function isPending(value: unknown): boolean
```

### isFulfilled

```ts
function isFulfilled(value: unknown): boolean
```

### isRejected

```ts
function isRejected(value: unknown): boolean
```

### unwrap

Get resolved value or throw error.

```ts
function unwrap<T>(value: T | PromiseLike<T>): Awaited<T>
```

---

## Type Guards

### isAtom

```ts
function isAtom<T = unknown>(value: unknown): value is Atom<T>
```

### isDerived

```ts
function isDerived<T = unknown>(value: unknown): value is DerivedAtom<T>
```

### isPool

```ts
function isPool<P = unknown, T = unknown>(value: unknown): value is Pool<P, T>
```

### isVirtualAtom

```ts
function isVirtualAtom<T = unknown>(value: unknown): value is VirtualAtom<T>
```

---

## Hooks

### onCreateHook

Register hook for atom/derived/effect/pool creation.

```ts
const onCreateHook: {
  current: ((info: CreateInfo) => void) | null;
  add(hook: (info: CreateInfo) => void): () => void;
}
```

#### CreateInfo

```ts
type CreateInfo = MutableInfo | DerivedInfo | EffectInfo | ModuleInfo | PoolInfo
```

### onErrorHook

Register hook for error handling.

```ts
const onErrorHook: {
  current: ((info: ErrorInfo) => void) | null;
  add(hook: (info: ErrorInfo) => void): () => void;
}
```

#### ErrorInfo

```ts
interface ErrorInfo {
  source: CreateInfo;
  error: unknown;
}
```

---

## Types

### Equality

```ts
type Equality<T> = 'strict' | 'shallow' | 'deep' | ((a: T, b: T) => boolean)
```

### AtomState

```ts
type AtomState<T> =
  | { status: 'ready'; value: T }
  | { status: 'error'; error: unknown }
  | { status: 'loading'; promise: Promise<T> }
```

### SettledResult

```ts
type SettledResult<T> =
  | { status: 'ready'; value: T }
  | { status: 'error'; error: unknown }
```

### PromiseState

```ts
type PromiseState<T> =
  | { status: 'pending'; promise: Promise<T> }
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; error: unknown }
```

### AtomMeta

```ts
interface AtomMeta {
  key?: string;
  [key: string]: unknown;
}
```

### Condition

Input type for `and()` / `or()` boolean operators.

```ts
type Condition =
  | boolean                         // Static value (no subscription)
  | Atom<unknown>                   // Always read & subscribed
  | (() => boolean | Atom<unknown>) // Lazy evaluation
```
