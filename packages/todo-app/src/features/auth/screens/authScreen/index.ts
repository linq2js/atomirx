/**
 * Auth screen barrel export.
 *
 * @description
 * Only exports the public AuthScreen component.
 * Screen-private components (AuthLayout, AuthLoadingState, AuthUnsupportedState)
 * are NOT exported - they are internal to AuthScreen.
 */

export { AuthScreen, useAuthScreenLogic } from "./authScreen";
export type { AuthView, UseAuthScreenLogicReturn } from "./authScreen";
export { AuthScreenPure } from "./authScreen.pure";
export type { AuthScreenPureProps } from "./authScreen.pure";
