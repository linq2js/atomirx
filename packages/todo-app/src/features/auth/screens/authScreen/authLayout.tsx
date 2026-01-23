/**
 * Auth page layout wrapper.
 *
 * @description
 * Provides the common layout for auth pages including
 * logo, title, card wrapper, and security info footer.
 */

import { ShieldCheck, KeyRound } from "lucide-react";

/**
 * Auth layout props.
 */
export interface AuthLayoutProps {
  /** Content to render inside the auth card */
  children: React.ReactNode;
}

/**
 * Auth page layout component.
 *
 * @example
 * ```tsx
 * <AuthLayout>
 *   <RegisterForm {...props} />
 * </AuthLayout>
 * ```
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Secure Todo</h1>
          <p className="mt-2 text-gray-600">
            Your todos, encrypted with passkeys
          </p>
        </div>

        {/* Auth card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">{children}</div>

        {/* Security info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p className="flex items-center justify-center gap-2">
            <KeyRound className="h-4 w-4" />
            Secured with end-to-end encryption
          </p>
        </div>
      </div>
    </div>
  );
}
