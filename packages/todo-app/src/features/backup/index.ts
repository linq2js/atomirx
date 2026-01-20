/**
 * Backup feature public API.
 *
 * @example
 * ```ts
 * import { BackupDialog, getBackupService } from "@/features/backup";
 *
 * const backup = getBackupService();
 * const result = await backup.exportBackup();
 * ```
 */

// Domain components
export { BackupDialog } from "./domain";
export type { BackupDialogProps } from "./domain";

// Services
export {
  createBackupService,
  getBackupService,
  downloadBlob,
} from "./services";
export type {
  BackupService,
  BackupFile,
  ExportResult,
  ExportError,
  ImportResult,
  ImportError,
} from "./services";
