import { router } from 'expo-router';
import { LogBox } from 'react-native';

type BackFn = (() => void) & { __hiitSafe?: boolean };

/**
 * Expo Router / React Navigation dispatches a GO_BACK action internally
 * when a <Redirect> fires on the root screen (e.g. tabs → onboarding).
 * Because the stack has only one entry, the action is "unhandled" and
 * React Navigation logs a console.error in development.
 *
 * Two defences:
 * 1. LogBox.ignoreLogs – suppresses the red overlay (console.error) in dev.
 * 2. Monkey-patch router.back() so our own call-sites never trigger the
 *    unhandled-action path. Uses canGoBack() (checks the full stack) rather
 *    than canDismiss() (only checks modals).
 */
export function installSafeBack(): void {
  // Suppress the dev-only red overlay for this specific warning.
  LogBox.ignoreLogs(["The action 'GO_BACK' was not handled by any navigator"]);

  // Secondary defence: filter the console.error that React Navigation emits
  // internally when a Redirect fires on the root screen. LogBox alone may
  // not catch the underlying console.error on all platforms.
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes("The action 'GO_BACK' was not handled by any navigator")
    ) {
      return; // swallow — this is harmless and dev-only
    }
    origError.apply(console, args);
  };

  const current = router.back as BackFn;
  if (current.__hiitSafe) return;

  const safe: BackFn = () => {
    if (router.canGoBack()) {
      current.call(router);
      return;
    }
    // Nowhere to go back – navigate home instead of crashing.
    router.replace('/');
  };
  safe.__hiitSafe = true;
  (router as { back: BackFn }).back = safe;
}
