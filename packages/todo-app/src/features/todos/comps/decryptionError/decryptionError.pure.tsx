/**
 * DecryptionError presentation component.
 *
 * @description
 * Pure presentation component for DecryptionError.
 *
 * @businessRules
 * - Shown when decryption fails due to session key mismatch
 * - Provides sign out button to re-authenticate
 * - Explains the issue and resolution steps
 */

import { AlertCircle } from "lucide-react";
import { Button } from "@/ui";

/**
 * DecryptionError pure component props.
 */
export interface DecryptionErrorPureProps {
  /** Callback when sign out is clicked */
  onLogout: () => void;
}

/**
 * DecryptionError pure presentation component.
 *
 * @example
 * ```tsx
 * <DecryptionErrorPure onLogout={handleLogout} />
 * ```
 */
export function DecryptionErrorPure({ onLogout }: DecryptionErrorPureProps) {
  return (
    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
          <AlertCircle className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-amber-900">Session key mismatch</h3>
          <p className="mt-1 text-sm text-amber-700">
            Your saved session doesn&apos;t match your stored data. Please sign
            out and sign in again with your passkey to restore access to your
            todos.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={onLogout}
            className="mt-3"
          >
            Sign out and re-authenticate
          </Button>
        </div>
      </div>
    </div>
  );
}
