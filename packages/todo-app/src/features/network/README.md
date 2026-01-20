# Network Feature

## Purpose

Monitors network connectivity using browser events. Provides reactive state for online/offline status that other features can subscribe to.

## Business Rules Summary

- Initializes from `navigator.onLine`
- Listens to `window.online` and `window.offline` events
- Provides read-only reactive state
- Allows manual override for testing

## Folder Structure

- `stores/` - Network state management with atomirx

## Key Files

- `stores/networkStore.ts` - Network atoms and event listeners

## Dependencies

- Depends on: None (leaf feature)
- Used by: `@/features/sync` (auto-sync trigger)
- Used by: `@/features/todos` (UI display)
