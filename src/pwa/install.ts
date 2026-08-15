import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function listenForWebInstall(): void {
  if (Platform.OS !== 'web') return;
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

export function canPromptWebInstall(): boolean {
  return deferred != null;
}

export async function promptWebInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable';
  const event = deferred;
  deferred = null;
  notify();
  await event.prompt();
  const choice = await event.userChoice;
  return choice.outcome;
}

export function useWebInstall(): {
  canInstall: boolean;
  install: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
} {
  const [canInstall, setCanInstall] = useState(canPromptWebInstall);
  useEffect(() => {
    const onChange = () => setCanInstall(canPromptWebInstall());
    listeners.add(onChange);
    onChange();
    return () => {
      listeners.delete(onChange);
    };
  }, []);
  return { canInstall, install: promptWebInstall };
}
