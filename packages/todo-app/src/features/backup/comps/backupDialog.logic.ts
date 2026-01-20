/**
 * Backup dialog logic hook.
 *
 * @description
 * Manages state and handlers for the backup dialog.
 * Handles export, import, file validation, and result display.
 */

import { useState, useCallback, useRef } from "react";
import { getBackupService, downloadBlob } from "../services";

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
export interface UseBackupDialogLogicReturn {
  /** Currently active tab */
  activeTab: "export" | "import";
  /** Set active tab */
  setActiveTab: (tab: "export" | "import") => void;
  /** Whether export is in progress */
  isExporting: boolean;
  /** Whether import is in progress */
  isImporting: boolean;
  /** Export operation result */
  exportResult: OperationResult | null;
  /** Import operation result */
  importResult: OperationResult | null;
  /** Currently selected file */
  selectedFile: File | null;
  /** File validation result */
  fileValidation: FileValidation | null;
  /** Ref for file input element */
  fileInputRef: React.RefObject<HTMLInputElement>;
  /** Handle export button click */
  handleExport: () => Promise<void>;
  /** Handle file selection */
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  /** Handle import button click */
  handleImport: () => Promise<void>;
  /** Handle dialog open state change */
  handleOpenChange: (newOpen: boolean) => void;
}

/**
 * Backup dialog logic hook.
 *
 * @param onOpenChange - Callback when dialog open state changes
 * @returns Dialog state and handlers
 *
 * @example
 * ```tsx
 * const dialog = useBackupDialogLogic(onOpenChange);
 * return <BackupDialogUI {...dialog} />;
 * ```
 */
export function useBackupDialogLogic(
  onOpenChange: (open: boolean) => void
): UseBackupDialogLogicReturn {
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const backupService = getBackupService();

  /**
   * Handle export.
   */
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportResult(null);

    try {
      const result = await backupService.exportBackup();

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
  }, [backupService]);

  /**
   * Handle file selection.
   */
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setSelectedFile(file);
      setFileValidation(null);
      setImportResult(null);

      const validation = await backupService.validateBackup(file);
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
    [backupService]
  );

  /**
   * Handle import.
   */
  const handleImport = useCallback(async () => {
    if (!selectedFile || !fileValidation?.valid) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await backupService.importBackup(selectedFile);

      if (result.success) {
        setImportResult({
          success: true,
          message: `Imported ${result.todoCount} todos (${result.skippedCount} skipped)`,
        });
        // Reset file selection
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
  }, [selectedFile, fileValidation, backupService]);

  /**
   * Reset state when dialog closes.
   */
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setExportResult(null);
        setImportResult(null);
        setSelectedFile(null);
        setFileValidation(null);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

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
    handleExport,
    handleFileSelect,
    handleImport,
    handleOpenChange,
  };
}
