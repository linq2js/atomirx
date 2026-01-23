# Backup Feature

## Purpose

Provides export and import functionality for encrypted todo data. Users can download backups of their data and restore from backup files.

## Business Rules Summary

- Exported data remains encrypted (requires same passkey to restore)
- Backup file is JSON format with version identifier
- Import validates file format before processing
- Import uses LWW (Last-Write-Wins) - skips todos with newer local versions
- Pending sync operations are included in backup

## Folder Structure

- `domain/` - BackupDialog component for export/import UI
- `services/` - Backup service for file operations

## Key Files

- `domain/BackupDialog.tsx` - Modal UI for backup operations
- `services/backupService.ts` - Export/import/validate logic

## Dependencies

- Depends on: `@/features/todos` (storage service for data access)
- Used by: `App.tsx` or settings menu

## Backup File Format

```json
{
  "version": 1,
  "exportedAt": 1705000000000,
  "appId": "secure-todo",
  "todos": [
    {
      "id": "uuid",
      "encryptedContent": "base64...",
      "completed": false,
      "createdAt": 1705000000000,
      "updatedAt": 1705000000000,
      "syncStatus": "synced"
    }
  ],
  "operations": [],
  "syncMeta": {
    "lastSyncAt": 1705000000000,
    "pendingCount": 0
  }
}
```
