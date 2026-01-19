/**
 * Backup dialog component.
 *
 * @description
 * Dialog for exporting and importing backup files.
 * Supports download of encrypted backups and file import.
 */

import { useState, useCallback, useRef } from "react";
import {
  Download,
  Upload,
  FileJson,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Dialog, Button } from "./ui";
import { getBackupService, downloadBlob } from "@/services/backup";
import { cn } from "@/lib/utils";

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
  const [activeTab, setActiveTab] = useState<"export" | "import">("export");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportResult, setExportResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileValidation, setFileValidation] = useState<{
    valid: boolean;
    message: string;
  } | null>(null);
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

      // Validate file
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
        // Reset state
        setExportResult(null);
        setImportResult(null);
        setSelectedFile(null);
        setFileValidation(null);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Backup & Restore"
      description="Export your encrypted data or restore from a backup file"
    >
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab("export")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === "export"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          <Download className="h-4 w-4" />
          Export
        </button>
        <button
          onClick={() => setActiveTab("import")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === "import"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          <Upload className="h-4 w-4" />
          Import
        </button>
      </div>

      {/* Export tab */}
      {activeTab === "export" && (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Export Backup</h3>
            <p className="text-sm text-gray-600 mb-4">
              Download a backup of all your encrypted todos. The backup can only
              be restored using the same passkey.
            </p>
            <ul className="text-sm text-gray-600 space-y-1 mb-4">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Includes all todos and completion status
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Data remains encrypted in backup
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Pending sync operations included
              </li>
            </ul>
            <Button
              onClick={handleExport}
              isLoading={isExporting}
              loadingText="Exporting..."
              leftIcon={<Download className="h-4 w-4" />}
            >
              Download Backup
            </Button>
          </div>

          {/* Export result */}
          {exportResult && (
            <div
              className={cn(
                "flex items-start gap-2 p-3 rounded-lg",
                exportResult.success
                  ? "bg-green-50 text-green-800"
                  : "bg-red-50 text-red-800"
              )}
            >
              {exportResult.success ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              )}
              <span className="text-sm">{exportResult.message}</span>
            </div>
          )}
        </div>
      )}

      {/* Import tab */}
      {activeTab === "import" && (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Import Backup</h3>
            <p className="text-sm text-gray-600 mb-4">
              Restore todos from a backup file. You must be logged in with the
              same passkey that created the backup.
            </p>

            {/* File input */}
            <div className="space-y-3">
              <label
                className={cn(
                  "flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                  "hover:bg-gray-100",
                  selectedFile
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300"
                )}
              >
                <FileJson className="h-8 w-8 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {selectedFile
                    ? selectedFile.name
                    : "Select backup file (.json)"}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>

              {/* File validation */}
              {fileValidation && (
                <div
                  className={cn(
                    "flex items-center gap-2 text-sm",
                    fileValidation.valid ? "text-green-600" : "text-red-600"
                  )}
                >
                  {fileValidation.valid ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  {fileValidation.message}
                </div>
              )}

              <Button
                onClick={handleImport}
                disabled={!selectedFile || !fileValidation?.valid}
                isLoading={isImporting}
                loadingText="Importing..."
                leftIcon={<Upload className="h-4 w-4" />}
              >
                Import Backup
              </Button>
            </div>
          </div>

          {/* Import result */}
          {importResult && (
            <div
              className={cn(
                "flex items-start gap-2 p-3 rounded-lg",
                importResult.success
                  ? "bg-green-50 text-green-800"
                  : "bg-red-50 text-red-800"
              )}
            >
              {importResult.success ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              )}
              <span className="text-sm">{importResult.message}</span>
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-yellow-50 text-yellow-800 rounded-lg">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span className="text-sm">
              Import only works with backups created using the same passkey.
              Todos with newer local versions will be skipped.
            </span>
          </div>
        </div>
      )}
    </Dialog>
  );
}
