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

// Components with business rules
export { BackupDialog } from "./comps";
export type { BackupDialogProps } from "./comps";

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
