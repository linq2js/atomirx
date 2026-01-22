# Hooks - Core Object Manipulation & Global Error Handling

Hooks provide extension points for middleware, devtools, monitoring, and cross-cutting concerns in atomirx.

## Overview

| Hook           | Purpose                                       | Fires When                        |
| -------------- | --------------------------------------------- | --------------------------------- |
| `onCreateHook` | Track atom/derived/effect/module creation     | Any reactive primitive is created |
| `onErrorHook`  | Global error handling for derived and effects | Error thrown in derived or effect |
| `hook()`       | Create custom hooks (advanced)                | N/A - factory for creating hooks  |

## CRITICAL Rule: MUST Use `.override()` - NEVER Direct Assignment

**NEVER** assign directly to `.current` - it **BREAKS** the hook chain.

```typescript
// ❌ FORBIDDEN: Breaks existing handlers
onCreateHook.current = (info) => { ... };
onErrorHook.current = (info) => { ... };

// ✅ REQUIRED: Preserves hook chain
onCreateHook.override((prev) => (info) => {
  prev?.(info); // call existing handlers first
  // your code here
});

onErrorHook.override((prev) => (info) => {
  prev?.(info); // call existing handlers first
  // your code here
});
```

## Hook API

| Method       | Signature                   | Description                             |
| ------------ | --------------------------- | --------------------------------------- |
| `.current`   | `T \| undefined`            | Read-only current value                 |
| `.override() | `(reducer: (prev) => next)` | Set new value using reducer (chainable) |
| `.reset()`   | `() => void`                | Reset to initial value (clears all)     |
| `hook.use()` | `(setups[], fn) => T`       | Temporarily set hooks during fn         |

## onCreateHook - Object Creation Tracking

Fires when atoms, derived, effects, or modules are created.

### CreateInfo Types

```typescript
// Mutable atom
interface MutableCreateInfo {
  type: "mutable";
  key: string | undefined; // from meta.key
  meta: MutableAtomMeta | undefined;
  atom: MutableAtom<unknown>; // the created atom
}

// Derived atom
interface DerivedCreateInfo {
  type: "derived";
  key: string | undefined;
  meta: DerivedAtomMeta | undefined;
  atom: DerivedAtom<unknown, boolean>;
}

// Effect
interface EffectCreateInfo {
  type: "effect";
  key: string | undefined;
  meta: EffectMeta | undefined;
  effect: Effect;
}

// Module (from define())
interface ModuleCreateInfo {
  type: "module";
  key: string | undefined;
  meta: ModuleMeta | undefined;
  module: unknown;
}
```

### Use Cases

#### 1. DevTools Registry

```typescript
import { onCreateHook } from "atomirx";

const registry = {
  atoms: new Map<string, MutableAtom<unknown>>(),
  derived: new Map<string, DerivedAtom<unknown, boolean>>(),
  effects: new Map<string, Effect>(),
  modules: new Map<string, unknown>(),
};

onCreateHook.override((prev) => (info) => {
  prev?.(info);

  const key = info.key ?? `anonymous-${Date.now()}`;

  switch (info.type) {
    case "mutable":
      registry.atoms.set(key, info.atom);
      break;
    case "derived":
      registry.derived.set(key, info.atom);
      break;
    case "effect":
      registry.effects.set(key, info.effect);
      break;
    case "module":
      registry.modules.set(key, info.module);
      break;
  }
});

// Export for devtools panel
window.__ATOMIRX_DEVTOOLS__ = registry;
```

#### 2. Persistence Middleware

```typescript
import { onCreateHook } from "atomirx";

// Extend meta type
declare module "atomirx" {
  interface MutableAtomMeta {
    persisted?: boolean;
  }
}

onCreateHook.override((prev) => (info) => {
  prev?.(info);

  // Only handle mutable atoms with persisted flag
  if (info.type !== "mutable" || !info.meta?.persisted || !info.key) {
    return;
  }

  const storageKey = `app:${info.key}`;

  // Restore from localStorage on creation
  if (!info.atom.dirty()) {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        info.atom.set(JSON.parse(stored));
      } catch {
        // Invalid JSON, ignore
      }
    }
  }

  // Save to localStorage on every change
  info.atom.on(() => {
    localStorage.setItem(storageKey, JSON.stringify(info.atom.get()));
  });
});

// Usage
const settings$ = atom(
  { theme: "dark" },
  {
    meta: { key: "user.settings", persisted: true },
  }
);
```

#### 3. Validation Middleware

```typescript
import { onCreateHook } from "atomirx";

declare module "atomirx" {
  interface MutableAtomMeta {
    validate?: (value: unknown) => boolean;
  }
}

onCreateHook.override((prev) => (info) => {
  prev?.(info);

  if (info.type !== "mutable" || !info.meta?.validate) {
    return;
  }

  const validate = info.meta.validate;
  const originalSet = info.atom.set.bind(info.atom);

  // Wrap set() with validation
  info.atom.set = (valueOrReducer) => {
    const nextValue =
      typeof valueOrReducer === "function"
        ? (valueOrReducer as (prev: unknown) => unknown)(info.atom.get())
        : valueOrReducer;

    if (!validate(nextValue)) {
      console.warn(`Validation failed for ${info.key}:`, nextValue);
      return; // Reject update
    }

    originalSet(valueOrReducer);
  };
});

// Usage
const age$ = atom(25, {
  meta: {
    key: "user.age",
    validate: (v) => typeof v === "number" && v >= 0 && v <= 150,
  },
});
```

#### 4. Debug Logging

```typescript
import { onCreateHook } from "atomirx";

// Only in development
if (process.env.NODE_ENV === "development") {
  onCreateHook.override((prev) => (info) => {
    prev?.(info);
    console.log(`[atomirx] Created ${info.type}: ${info.key ?? "anonymous"}`);
  });
}
```

## onErrorHook - Global Error Handling

Fires when errors occur in derived atoms or effects.

### ErrorInfo Type

```typescript
interface ErrorInfo {
  source: CreateInfo; // The atom/effect that errored
  error: unknown; // The thrown error
}
```

### Use Cases

#### 1. Error Monitoring (Sentry, etc.)

```typescript
import { onErrorHook } from "atomirx";
import * as Sentry from "@sentry/browser";

onErrorHook.override((prev) => (info) => {
  prev?.(info);

  Sentry.captureException(info.error, {
    tags: {
      source_type: info.source.type,
      source_key: info.source.key ?? "anonymous",
    },
    extra: {
      meta: info.source.meta,
    },
  });
});
```

#### 2. Console Logging

```typescript
import { onErrorHook } from "atomirx";

onErrorHook.override((prev) => (info) => {
  prev?.(info);

  console.error(
    `[atomirx] Error in ${info.source.type}: ${info.source.key ?? "anonymous"}`,
    info.error
  );
});
```

#### 3. Error Toast Notifications

```typescript
import { onErrorHook } from "atomirx";
import { toast } from "your-toast-library";

onErrorHook.override((prev) => (info) => {
  prev?.(info);

  // Only show toast for user-facing errors
  if (info.error instanceof UserFacingError) {
    toast.error(info.error.message);
  }
});
```

#### 4. Error Aggregation

```typescript
import { onErrorHook } from "atomirx";

const errorLog: ErrorInfo[] = [];

onErrorHook.override((prev) => (info) => {
  prev?.(info);

  errorLog.push(info);

  // Keep last 100 errors
  if (errorLog.length > 100) {
    errorLog.shift();
  }
});

// Export for devtools
export const getErrorLog = () => [...errorLog];
```

## hook() - Creating Custom Hooks (Advanced)

For advanced use cases, create custom hooks using `hook()`.

### Basic Custom Hook

```typescript
import { hook } from "atomirx";

// Create a debug mode hook
const debugHook = hook(false);

// Read current value
console.log(debugHook.current); // false

// Override value
debugHook.override(() => true);
console.log(debugHook.current); // true

// Reset to initial
debugHook.reset();
console.log(debugHook.current); // false
```

### Temporary Hook Values with hook.use()

```typescript
import { hook } from "atomirx";

const loggerHook = hook<(msg: string) => void>();

// Temporarily set a logger
const result = hook.use(
  [loggerHook(() => (msg) => console.log("[TEST]", msg))],
  () => {
    loggerHook.current?.("Inside hook.use()");
    return "result";
  }
);

// Outside hook.use(), logger is reset
loggerHook.current?.("Outside"); // Does nothing (undefined)
```

### Composing Multiple Hooks

```typescript
import { hook } from "atomirx";

const trackingHook = hook<(event: string) => void>();
const metricsHook = hook<(name: string, value: number) => void>();

// Run code with both hooks active
hook.use(
  [
    trackingHook(() => (event) => analytics.track(event)),
    metricsHook(() => (name, value) => metrics.record(name, value)),
  ],
  () => {
    // Both hooks active here
    trackingHook.current?.("button_click");
    metricsHook.current?.("latency", 150);
  }
);
```

## Testing with Hooks (IMPORTANT)

### MUST Isolate Tests - Reset Hooks in beforeEach/afterEach

```typescript
import { onCreateHook, onErrorHook } from "atomirx";

describe("MyStore", () => {
  const originalCreate = onCreateHook.current;
  const originalError = onErrorHook.current;

  beforeEach(() => {
    // Clear hooks for test isolation
    onCreateHook.reset();
    onErrorHook.reset();
  });

  afterEach(() => {
    // Restore original hooks
    onCreateHook.current = originalCreate;
    onErrorHook.current = originalError;
  });

  it("should track created atoms", () => {
    const created: string[] = [];
    onCreateHook.override((prev) => (info) => {
      prev?.(info);
      if (info.key) created.push(info.key);
    });

    // Test code that creates atoms...
    expect(created).toContain("myStore.counter");
  });
});
```

### Verifying Error Handling

```typescript
it("should call error hook on derived error", async () => {
  const errors: ErrorInfo[] = [];
  onErrorHook.override((prev) => (info) => {
    prev?.(info);
    errors.push(info);
  });

  const buggy$ = derived(
    ({ read }) => {
      throw new Error("test error");
    },
    { meta: { key: "buggy" } }
  );

  // Trigger the derived computation
  try {
    await buggy$.get();
  } catch {}

  expect(errors).toHaveLength(1);
  expect(errors[0].source.key).toBe("buggy");
});
```

## Initialization Order (CRITICAL)

**MUST** set up hooks early in your app, **BEFORE** any atoms are created:

```typescript
// src/app/init.ts
import { onCreateHook, onErrorHook } from "atomirx";

// 1. DevTools (first - tracks everything)
onCreateHook.override((prev) => (info) => {
  prev?.(info);
  window.__ATOMIRX_REGISTRY__?.add(info);
});

// 2. Error monitoring (catches all errors)
onErrorHook.override((prev) => (info) => {
  prev?.(info);
  Sentry.captureException(info.error);
});

// 3. Persistence (after devtools)
onCreateHook.override((prev) => (info) => {
  prev?.(info);
  if (info.type === "mutable" && info.meta?.persisted) {
    setupPersistence(info);
  }
});

// src/app/main.tsx
import "./init"; // Run hooks setup first
import { App } from "./App";
```

## Summary (MUST Follow These Patterns)

| Task                    | Hook           | Pattern                                                       |
| ----------------------- | -------------- | ------------------------------------------------------------- |
| Track atom creation     | `onCreateHook` | **MUST** use `override((prev) => (info) => { prev?.(info) })` |
| Global error logging    | `onErrorHook`  | **MUST** use `override((prev) => (info) => { prev?.(info) })` |
| Persistence middleware  | `onCreateHook` | Check `info.meta?.persisted`                                  |
| Validation middleware   | `onCreateHook` | Wrap `info.atom.set()`                                        |
| Error monitoring        | `onErrorHook`  | Send to Sentry/etc                                            |
| DevTools integration    | `onCreateHook` | Register in global registry                                   |
| Reset all handlers      | Both           | **MUST** use `.reset()` in tests                              |
| Temporary hooks (tests) | `hook.use()`   | `hook.use([setup], fn)`                                       |
