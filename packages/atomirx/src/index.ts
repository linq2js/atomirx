// Core
export { atom, readonly } from "./core/atom";
export { batch } from "./core/batch";
export { define } from "./core/define";
export { derived, type DerivedContext } from "./core/derived";
export { effect, type EffectContext } from "./core/effect";
export { emitter } from "./core/emitter";
export { isAtom, isDerived } from "./core/isAtom";
export { pool, isPool } from "./core/pool";
export {
  select,
  AllAtomsRejectedError,
  isScopedAtom,
  type Condition,
} from "./core/select";

// Promise utilities
export { getAtomState } from "./core/getAtomState";
export {
  isPending,
  isFulfilled,
  isRejected,
  trackPromise,
  unwrap,
} from "./core/promiseCache";

// Types
export type {
  Atom,
  AtomMeta,
  AtomOptions,
  AtomState,
  AtomValue,
  AnyAtom,
  DerivedAtom,
  DerivedAtomMeta,
  DerivedOptions,
  EffectOptions,
  Equality,
  EqualityShorthand,
  Getter,
  KeyedResult,
  MutableAtom,
  MutableAtomMeta,
  Pipeable,
  Pool,
  PoolEvent,
  PoolMeta,
  PoolOptions,
  SelectStateResult,
  SettledResult,
  ScopedAtom,
} from "./core/types";

export { onCreateHook } from "./core/onCreateHook";
export type {
  CreateInfo,
  MutableInfo,
  DerivedInfo,
  EffectInfo,
  ModuleInfo,
} from "./core/onCreateHook";

export { onErrorHook } from "./core/onErrorHook";
export type { ErrorInfo } from "./core/onErrorHook";

export type {
  SelectContext,
  SelectOutput,
  SelectResult,
  ReactiveSelector as ContextSelectorFn,
  SafeResult,
} from "./core/select";

export type { PromiseState, CombinedPromiseMeta } from "./core/promiseCache";

export { promisesEqual } from "./core/promiseCache";
