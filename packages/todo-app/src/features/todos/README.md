# Todos Feature

## Proposed Changes <!-- FSA Refactoring -->

- [ ] Merge `todoItem.logic.ts` → `todoItem.tsx`
- [ ] Merge `todoList.logic.ts` → `todoList.tsx`
- [ ] Merge `clearCompletedButton.logic.ts` → `clearCompletedButton.tsx`
- [ ] Merge `todosPage.logic.ts` → `todosPage.tsx`
- [ ] Convert all comps to folder structure:
  - `todoItem/`, `todoList/`, `todoInput/`, `filterBar/`, `statusBadge/`
  - `syncButton/`, `todosHeader/`, `todoStats/`, `clearCompletedButton/`
  - `skeletonTodoItem/`, `decryptionError/`
- [ ] Each component gets: `index.ts`, `xxx.tsx`, `xxx.pure.tsx`
- [ ] Create `todosPage.pure.tsx` with TodosPagePure presentation

## Purpose

Manages the todo list with encrypted storage, CRUD operations, filtering, and optimistic updates. All todo content is encrypted before storage using the encryption key derived during authentication.

## Business Rules Summary

- Todo content is encrypted using AES-256-GCM before storage
- Completed todos show strikethrough styling
- Double-click enables inline editing
- Empty content is not allowed
- Todos are soft-deleted for sync purposes
- Optimistic updates with rollback on failure
- Filter persists in memory (all/active/completed)

## Folder Structure

- `comps/` - Business components (TodoItem, TodoInput, FilterBar, etc.)
- `services/` - Storage service for encrypted IndexedDB operations
- `stores/` - Todo state management with atomirx
- `pages/` - TodosPage composition
- `types/` - TypeScript interfaces for todos and storage

**Note:** Features MUST NOT have `ui/` folder. Use shared `ui/` components.

## Key Files

- `comps/todoItem.tsx` - Individual todo with completion toggle, edit, delete
- `comps/todoItem.logic.ts` - TodoItem logic hook
- `comps/todoInput.tsx` - New todo input with validation
- `comps/todoList.tsx` - Filtered todo list display
- `comps/todoList.logic.ts` - TodoList logic hook
- `comps/filterBar.tsx` - Filter buttons (all/active/completed)
- `comps/clearCompletedButton.tsx` - Clear completed todos button
- `comps/clearCompletedButton.logic.ts` - ClearCompletedButton logic hook
- `services/storage.service.ts` - Encrypted IndexedDB operations
- `services/db.ts` - Dexie schema for IndexedDB
- `stores/todos.store.ts` - Todo state atoms and actions
- `pages/todosPage/todosPage.tsx` - Main todo list page
- `pages/todosPage/todosPage.logic.ts` - Page logic hook

## Dependencies

- Depends on: `@/features/auth` (encryption key, crypto service)
- Depends on: `@/features/sync` (sync status display)
- Depends on: `@/features/network` (online status)
- Used by: `App.tsx` (main route)

## Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                        TodosPage                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ TodoInput   │  │ FilterBar   │  │     TodoList        │  │
│  │ (add todo)  │  │ (filter)    │  │  ┌─────────────┐    │  │
│  └──────┬──────┘  └──────┬──────┘  │  │  TodoItem   │    │  │
│         │                │         │  │  (toggle,   │    │  │
│         │                │         │  │   edit,     │    │  │
│         │                │         │  │   delete)   │    │  │
│         │                │         │  └──────┬──────┘    │  │
│         │                │         └─────────┼───────────┘  │
└─────────┼────────────────┼───────────────────┼──────────────┘
          │                │                   │
          ▼                ▼                   ▼
    ┌─────────────────────────────────────────────────┐
    │                 todosStore                       │
    │  ┌─────────┐  ┌──────────┐  ┌───────────────┐   │
    │  │ todos$  │  │ filter$  │  │ filteredTodos$│   │
    │  └────┬────┘  └─────┬────┘  └───────────────┘   │
    │       │             │                            │
    │       ├─────────────┤                            │
    │       ▼             │                            │
    │  storageService     │                            │
    │  (encrypt/decrypt)  │                            │
    └──────────┬──────────┴────────────────────────────┘
               │
               ▼
    ┌─────────────────────┐
    │  IndexedDB (Dexie)  │
    │  (encrypted todos)  │
    └─────────────────────┘
```

## Storage Schema

```typescript
interface EncryptedTodo {
  id: string; // UUID v4
  encryptedContent: string; // AES-GCM encrypted JSON
  completed: boolean;
  createdAt: number; // Unix timestamp
  updatedAt: number; // For conflict resolution
  syncStatus: "pending" | "synced" | "conflict";
  serverId?: number; // From jsonplaceholder
  deleted?: boolean; // Soft delete flag
}
```
