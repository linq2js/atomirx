# Plan: Fix atomirx Pattern Violations in todo-app

## Context

The todo-app package has several violations of atomirx patterns/rules that need to be fixed for consistency and testability.

## Tasks

| # | Task | Files | Status | Dependencies | Updated |
|---|------|-------|--------|--------------|---------|
| 1 | Refactor services to use `define()` pattern | 6 | ✅ done | - | 2026-01-20 |
| 2 | Add missing `meta.key` to derived atoms & effects | 4 | ✅ done | 1 | 2026-01-20 |
| 3 | Rename stores from `*Module` to `*Store` | 5 | ✅ done | 2 | 2026-01-20 |
| 4 | Rename store files from `*.module.ts` to `*.store.ts` | 8 | ✅ done | 3 | 2026-01-20 |
| 5 | Update all imports across the app | ~10 | ✅ done | 4 | 2026-01-20 |
| | **Total** | ~33 | | | |

---

## Task Details

### Task 1: Refactor services to use `define()` pattern (6 files)

**Files to change:**
- `src/services/auth/auth.service.ts` - Convert to define()
- `src/services/auth/index.ts` - Update exports
- `src/services/crypto/crypto.service.ts` - Convert to define()
- `src/services/crypto/index.ts` - Update exports
- `src/services/storage/storage.service.ts` - Convert to define()
- `src/services/storage/index.ts` - Update exports

**Pattern change:**
```typescript
// FROM (forbidden factory pattern):
let _instance: AuthServiceImpl | null = null;
export function getAuthService(): AuthServiceImpl {
  if (!_instance) _instance = createAuthService();
  return _instance;
}

// TO (required define() pattern):
export const authService = define((): AuthService => ({
  // implementation
}));
```

### Task 2: Add missing `meta.key` to derived atoms & effects (4 files)

**Files to change:**
- `src/state/auth.module.ts` - 2 derived missing keys
- `src/state/todos.module.ts` - 4 derived missing keys
- `src/state/sync.module.ts` - 2 derived + 1 effect missing keys
- `src/state/network.module.ts` - 1 effect missing key

### Task 3: Rename stores from `*Module` to `*Store` (5 files)

**Files to change:**
- `src/state/auth.module.ts` - authModule → authStore
- `src/state/todos.module.ts` - todosModule → todosStore
- `src/state/sync.module.ts` - syncModule → syncStore
- `src/state/network.module.ts` - networkModule → networkStore
- `src/state/index.ts` - Update exports

### Task 4: Rename store files (8 operations)

**Git operations:**
- `git mv src/state/auth.module.ts src/state/auth.store.ts`
- `git mv src/state/todos.module.ts src/state/todos.store.ts`
- `git mv src/state/sync.module.ts src/state/sync.store.ts`
- `git mv src/state/network.module.ts src/state/network.store.ts`

### Task 5: Update all imports (~10 files)

**Files to update:**
- `src/state/index.ts`
- `src/state/sync.store.ts` (imports networkStore)
- `src/pages/TodosPage.tsx`
- `src/pages/AuthPage.tsx`
- `src/App.tsx`
- Any other files importing modules/services
