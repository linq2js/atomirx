/**
 * Backup dialog component.
 *
 * @description
 * Dialog for exporting and importing backup files.
 * Supports download of encrypted backups and file import.
 *
 * @businessRules
 * - Export creates JSON file with all encrypted todos
 * - Exported data can only be restored with same passkey
 * - Import validates file format before processing
 * - Import skips todos with newer local versions (LWW)
 * - File validation shows todo count before import
 * - Tab UI separates export and import workflows
 *
 * @edgeCases
 * - Invalid JSON file: Shows validation error
 * - Wrong app backup: Shows "wrong app" error
 * - Network error during export: Shows error message
 * - Large backup file: No size limit, but may be slow
 */

import {
  Download,
  Upload,
  FileJson,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Dialog, Button } from "@/ui";
import { cn } from "@/shared/utils";
import { useBackupDialogLogic } from "./backupDialog.logic";

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
  const {
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
  } = useBackupDialogLogic(onOpenChange);

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

          {exportResult && (
            <ResultMessage
              success={exportResult.success}
              message={exportResult.message}
            />
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

              {fileValidation && (
                <ValidationMessage
                  valid={fileValidation.valid}
                  message={fileValidation.message}
                />
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

          {importResult && (
            <ResultMessage
              success={importResult.success}
              message={importResult.message}
            />
          )}

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

/**
 * Result message component.
 */
function ResultMessage({
  success,
  message,
}: {
  success: boolean;
  message: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 p-3 rounded-lg",
        success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
      )}
    >
      {success ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
      )}
      <span className="text-sm">{message}</span>
    </div>
  );
}

/**
 * Validation message component.
 */
function ValidationMessage({
  valid,
  message,
}: {
  valid: boolean;
  message: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm",
        valid ? "text-green-600" : "text-red-600"
      )}
    >
      {valid ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      {message}
    </div>
  );
}
