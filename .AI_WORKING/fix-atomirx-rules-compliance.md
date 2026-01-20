# Plan: Fix atomirx Rules Compliance in todo-app

## Context

Verify and fix todo-app implementation to match atomirx rules. Several violations found during code review.

## Summary of Issues

### 1. Missing `readonly()` for Exported Atoms (CRITICAL)

All modules export atoms directly without `readonly()`, allowing external mutations.

### 2. Multiple `useSelector` Calls Not Grouped (CRITICAL)

Multiple components use separate `useSelector` calls that should be grouped into single call.

### 3. Missing `batch()` for Multiple Atom Updates

Several functions update multiple atoms sequentially without batching.

## Tasks

| #   | Task                                                                          | Status  | Dependencies | Updated    |
| --- | ----------------------------------------------------------------------------- | ------- | ------------ | ---------- |
| 1   | Add `readonly()` wrapper for exported atoms in all 4 modules                  | ✅ done | -            | 2026-01-19 |
| 2   | Group multiple `useSelector` calls in `TodosPage.tsx`                         | ✅ done | -            | 2026-01-19 |
| 3   | Group multiple `useSelector` calls in `AuthPage.tsx`                          | ✅ done | -            | 2026-01-19 |
| 4   | Add `batch()` in `auth.module.ts` for logout, restoreSession, register, login | ✅ done | -            | 2026-01-19 |
| 5   | Add `batch()` in `sync.module.ts` for loadSyncMeta, sync, reset               | ✅ done | -            | 2026-01-19 |
| 6   | Fix tsconfig.json paths for atomirx                                           | ✅ done | -            | 2026-01-19 |

---

## Task Details

### Task 1: Add `readonly()` wrapper for exported atoms

**Files to change:**

- `src/state/auth.module.ts`
- `src/state/todos.module.ts`
- `src/state/network.module.ts`
- `src/state/sync.module.ts`

**Pattern:**

```typescript
// Before
return {
  user$,
  authError$,
  // ...
};

// After
return {
  ...readonly({ user$, authError$ /* ... */ }),
  // derived atoms can be exported directly (already read-only)
  isAuthenticated$,
  // actions
  login,
  logout,
};
```

### Task 2: Group useSelector calls in TodosPage.tsx

**Locations:**

1. Lines 46-48: `user`, `isOnline`, `todosError`
2. Lines 210-211 (SyncButton): `syncStatus`, `isSyncing`
3. Lines 293-295 (TodoList): `filteredTodos`, `isLoading`, `filter`
4. Lines 372-375 (TodoStats): `activeCount`, `completedCount`, `pendingCount`, `hasTodos`

### Task 3: Group useSelector calls in AuthPage.tsx

**Location:**

- Lines 35-37: `authSupport`, `authError`, `isLoading`

### Task 4: Add batch() in auth.module.ts

**Functions:**

- `restoreSession()` - lines 254-255
- `register()` - lines 340-341
- `login()` - lines 429-430
- `logout()` - lines 455-458

### Task 5: Add batch() in sync.module.ts

**Functions:**

- `loadSyncMeta()` - lines 186-187
- `sync()` - lines 309-310
- `reset()` - lines 355-358
