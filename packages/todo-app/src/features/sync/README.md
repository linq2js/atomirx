# Sync Feature

## Purpose

Manages synchronization between local IndexedDB storage and a remote server (jsonplaceholder API for demo). Tracks pending operations and provides auto-sync when coming back online.

## Business Rules Summary

- Pending operations are queued and processed in order
- Auto-sync triggers when device comes back online
- Failed operations are tracked and can be retried
- Sync status provides clear UI feedback (synced/pending/syncing/error/offline)
- Uses jsonplaceholder as mock backend

## Folder Structure

- `stores/` - Sync state management with atomirx

## Key Files

- `stores/syncStore.ts` - Sync atoms, derived state, and actions

## Dependencies

- Depends on: `@/features/todos` (storage service)
- Depends on: `@/features/network` (online status)
- Used by: `@/features/todos/screens/TodosScreen` (sync button, status)
