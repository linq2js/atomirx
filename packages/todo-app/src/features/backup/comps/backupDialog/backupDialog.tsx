/**
 * Backup dialog component.
 *
 * @description
 * Dialog for exporting and importing backup files.
 * Supports download of encrypted backups and file import.
 */

import { useState, useRef } from "react";
import { useStable } from "atomirx/react";
import { backupService, downloadBlob } from "../../services/backup.service";
import {
  BackupDialogPure,
  type BackupDialogPureProps,
} from "./backupDialog.pure";

/**
 * Result state for export/import operations.
 */
interface OperationResult {
  success: boolean;
  message: string;
}

/**
 * File validation state.
 */
interface FileValidation {
  valid: boolean;
  message: string;
}

/**
 * Backup dialog logic hook return type.
 */
export type UseBackupDialogLogicReturn = Omit<BackupDialogPureProps, "open">;

/**
 * Backup dialog logic hook.
 *
 * @description
 * Manages state and handlers for the backup dialog.
 *
 * @param onOpenChange - Callback when dialog open state changes
 * @returns Dialog state and handlers
 */
export function useBackupDialogLogic(
  onOpenChange: (open: boolean) => void
): UseBackupDialogLogicReturn {
  // 1. External services
  const backup = backupService();

  // 2. Local state
  const [activeTab, setActiveTab] = useState<"export" | "import">("export");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportResult, setExportResult] = useState<OperationResult | null>(
    null
  );
  const [importResult, setImportResult] = useState<OperationResult | null>(
    null
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileValidation, setFileValidation] = useState<FileValidation | null>(
    null
  );

  // 3. Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 4. Callbacks (useStable)
  const callbacks = useStable({
    handleExport: async () => {
      setIsExporting(true);
      setExportResult(null);

      try {
        const result = await backup.exportBackup();

        if (result.success) {
          downloadBlob(result.data, result.filename);
          setExportResult({
            success: true,
            message: `Exported ${result.todoCount} todos to ${result.filename}`,
          });
        } else {
          setExportResult({
            success: false,
            message: result.error,
          });
        }
      } catch (error) {
        setExportResult({
          success: false,
          message: error instanceof Error ? error.message : "Export failed",
        });
      } finally {
        setIsExporting(false);
      }
    },

    handleFileSelect: async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setSelectedFile(file);
      setFileValidation(null);
      setImportResult(null);

      const validation = await backup.validateBackup(file);
      if (validation.valid) {
        setFileValidation({
          valid: true,
          message: `Valid backup with ${validation.todoCount} todos`,
        });
      } else {
        setFileValidation({
          valid: false,
          message: validation.error,
        });
      }
    },

    handleImport: async () => {
      if (!selectedFile || !fileValidation?.valid) return;

      setIsImporting(true);
      setImportResult(null);

      try {
        const result = await backup.importBackup(selectedFile);

        if (result.success) {
          setImportResult({
            success: true,
            message: `Imported ${result.todoCount} todos (${result.skippedCount} skipped)`,
          });
          setSelectedFile(null);
          setFileValidation(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        } else {
          setImportResult({
            success: false,
            message: result.error,
          });
        }
      } catch (error) {
        setImportResult({
          success: false,
          message: error instanceof Error ? error.message : "Import failed",
        });
      } finally {
        setIsImporting(false);
      }
    },

    handleOpenChange: (newOpen: boolean) => {
      if (!newOpen) {
        setExportResult(null);
        setImportResult(null);
        setSelectedFile(null);
        setFileValidation(null);
      }
      onOpenChange(newOpen);
    },
  });

  return {
    activeTab,
    setActiveTab,
    isExporting,
    isImporting,
    exportResult,
    importResult,
    selectedFile,
    fileValidation,
    fileInputRef,
    ...callbacks,
  };
}

/**
 * Backup dialog props.
 */
export interface BackupDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the dialog open state changes */
  onOpenChange: (open: boolean) => void;
}

/**
 * Backup dialog component.
 *
 * @example
 * ```tsx
 * <BackupDialog
 *   open={showBackup}
 *   onOpenChange={setShowBackup}
 * />
 * ```
 */
export function BackupDialog({ open, onOpenChange }: BackupDialogProps) {
  const pureProps = useBackupDialogLogic(onOpenChange);
  return <BackupDialogPure open={open} {...pureProps} />;
}
