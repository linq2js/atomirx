# Todos Feature

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
- `screens/` - TodosScreen composition (mobile-first terminology)
- `types/` - TypeScript interfaces for todos and storage

**Note:** Features MUST NOT have `ui/` folder. Use shared `ui/` components.
**Note:** FSA uses `screens/` instead of `pages/` for mobile-first compatibility.

## Key Files

- `comps/todoItem/` - Individual todo with completion toggle, edit, delete
- `comps/todoInput/` - New todo input with validation
- `comps/todoList/` - Filtered todo list display
- `comps/filterBar/` - Filter buttons (all/active/completed)
- `comps/clearCompletedButton/` - Clear completed todos button
- `services/storageService.ts` - Encrypted IndexedDB operations
- `services/db.ts` - Dexie schema for IndexedDB
- `stores/todosStore.ts` - Todo state atoms and actions
- `screens/todosScreen/todosScreen.tsx` - Main todo list screen with logic hook

## Dependencies

- Depends on: `@/features/auth` (encryption key, crypto service)
- Depends on: `@/features/sync` (sync status display)
- Depends on: `@/features/network` (online status)
- Used by: `App.tsx` (main route)

## Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                       TodosScreen                              │
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
