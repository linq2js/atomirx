/**
 * Backup dialog logic hook.
 *
 * @description
 * Manages state and handlers for the backup dialog.
 * Handles export, import, file validation, and result display.
 *
 * @businessRules
 * - Export creates JSON file with encrypted todo data
 * - Import validates file format before allowing import
 * - File must match app ID and backup version
 * - Dialog state resets when closed
 *
 * @stateFlow
 * closed → open(export tab) → export → success/error
 * closed → open(import tab) → select file → validate → import → success/error
 */

import { useState, useRef } from "react";
import { useStable } from "atomirx/react";
import { backupService, downloadBlob } from "../services/backup.service";

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
    // State
    activeTab,
    setActiveTab,
    isExporting,
    isImporting,
    exportResult,
    importResult,
    selectedFile,
    fileValidation,
    // Refs
    fileInputRef,
    // Handlers
    ...callbacks,
  };
}
