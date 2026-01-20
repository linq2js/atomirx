/**
 * ErrorBoundary presentation component.
 *
 * @description
 * Pure presentation component for error fallback UI.
 * Use this in Storybook to test the error state visual.
 *
 * Note: ErrorBoundary itself is a class component that cannot be split into
 * hook + pure pattern. This file contains the fallback UI presentation only.
 */

import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * ErrorFallback pure component props.
 */
export interface ErrorFallbackPureProps {
  /** Error message to display */
  errorMessage?: string;
  /** Handler for reset/refresh action */
  onReset: () => void;
}

/**
 * Error fallback pure presentation component.
 *
 * @example
 * ```tsx
 * <ErrorFallbackPure
 *   errorMessage="Something went wrong"
 *   onReset={() => window.location.reload()}
 * />
 * ```
 */
export function ErrorFallbackPure({ errorMessage, onReset }: ErrorFallbackPureProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-surface-950">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-surface-100">
            Something went wrong
          </h1>
          <p className="text-surface-400">
            An unexpected error occurred. Please try refreshing the page.
          </p>
        </div>

        {errorMessage && (
          <div className="bg-surface-900 rounded-lg p-4 text-left">
            <p className="text-xs font-mono text-red-400 break-all">
              {errorMessage}
            </p>
          </div>
        )}

        <button onClick={onReset} className="btn-primary">
          <RefreshCw className="w-4 h-4" />
          Refresh Page
        </button>
      </div>
    </div>
  );
}
