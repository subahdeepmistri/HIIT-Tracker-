import type { Href } from 'expo-router';

export interface BackRouter {
  replace: (href: Href) => void;
}

/**
 * Never dispatch GO_BACK. On web, canGoBack() can be true while the stack
 * is still empty (direct URL, refresh, Expo preview chrome), and Expo then
 * throws "The action 'GO_BACK' was not handled by any navigator."
 */
export function goBackOr(router: BackRouter, fallback: Href): void {
  router.replace(fallback);
}
