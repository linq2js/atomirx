/**
 * Auth page barrel export.
 *
 * @description
 * Only exports the public AuthPage component.
 * Page-private components (AuthLayout, AuthLoadingState, AuthUnsupportedState)
 * are NOT exported - they are internal to AuthPage.
 */

export { AuthPage, useAuthPageLogic } from "./authPage";
export type { AuthView, UseAuthPageLogicReturn } from "./authPage";
export { AuthPagePure } from "./authPage.pure";
export type { AuthPagePureProps } from "./authPage.pure";
