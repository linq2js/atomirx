import { clsx, type ClassValue } from "clsx";

/**
 * Utility function to merge Tailwind CSS classes.
 *
 * @param inputs - Class values to merge
 * @returns Merged class string
 *
 * @example
 * ```ts
 * cn("px-4 py-2", isActive && "bg-blue-500", className)
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * Generate a UUID v4.
 *
 * @returns A new UUID string
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get current Unix timestamp in milliseconds.
 *
 * @returns Current time in milliseconds
 */
export function now(): number {
  return Date.now();
}

/**
 * Convert ArrayBuffer or Uint8Array to base64 string.
 *
 * @param buffer - ArrayBuffer or Uint8Array to convert
 * @returns Base64 encoded string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array.
 *
 * @param base64 - Base64 encoded string
 * @returns Uint8Array with its own ArrayBuffer (not a view into shared buffer)
 */
export function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert ArrayBuffer to base64url string (URL-safe base64).
 *
 * @param buffer - ArrayBuffer to convert
 * @returns Base64url encoded string
 */
export function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  return arrayBufferToBase64(buffer)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Convert base64url string to Uint8Array.
 *
 * @param base64url - Base64url encoded string
 * @returns Uint8Array
 */
export function base64UrlToArrayBuffer(base64url: string): Uint8Array {
  // Add padding if necessary
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return base64ToArrayBuffer(base64);
}

/**
 * Sleep for a specified duration.
 *
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after the duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Debounce a function.
 *
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Format a date for display.
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Check if running in a secure context (HTTPS or localhost).
 *
 * @returns Whether the context is secure
 */
export function isSecureContext(): boolean {
  return window.isSecureContext;
}

/**
 * Check if running as installed PWA.
 *
 * @returns Whether running in standalone mode
 */
export function isStandalonePWA(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error - iOS Safari specific
    window.navigator.standalone === true
  );
}
