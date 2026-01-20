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

- `domain/` - TodoItem and TodoInput components with business logic
- `services/` - Storage service for encrypted IndexedDB operations
- `stores/` - Todo state management with atomirx
- `pages/` - TodosPage composition
- `types/` - TypeScript interfaces for todos and storage

## Key Files

- `domain/TodoItem.tsx` - Individual todo with completion toggle, edit, delete
- `domain/TodoInput.tsx` - New todo input with validation
- `services/storage.service.ts` - Encrypted IndexedDB operations
- `services/db.ts` - Dexie schema for IndexedDB
- `stores/todos.store.ts` - Todo state atoms and actions
- `pages/TodosPage.tsx` - Main todo list page

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
  id: string;              // UUID v4
  encryptedContent: string; // AES-GCM encrypted JSON
  completed: boolean;
  createdAt: number;       // Unix timestamp
  updatedAt: number;       // For conflict resolution
  syncStatus: "pending" | "synced" | "conflict";
  serverId?: number;       // From jsonplaceholder
  deleted?: boolean;       // Soft delete flag
}
```
