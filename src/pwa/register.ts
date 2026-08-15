import { Platform } from 'react-native';

export function registerWebApp(): void {
  if (Platform.OS !== 'web') return;
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  const register = () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // HTTP LAN / Expo web previews cannot install. Production HTTPS can.
    });
  };

  if (document.readyState === 'complete') {
    register();
    return;
  }
  window.addEventListener('load', register, { once: true });
}
