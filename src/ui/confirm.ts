import { Alert, Platform } from 'react-native';

export type ConfirmTone = 'danger' | 'default';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

type ConfirmHost = (request: ConfirmRequest) => Promise<boolean>;

let host: ConfirmHost | null = null;

export function registerConfirmHost(next: ConfirmHost | null): void {
  host = next;
}

export function confirmAction(
  title: string,
  message: string,
  confirmLabel = 'Confirm',
  extras?: Pick<ConfirmRequest, 'cancelLabel' | 'tone'>,
): Promise<boolean> {
  const request: ConfirmRequest = {
    title,
    message,
    confirmLabel,
    cancelLabel: extras?.cancelLabel ?? 'Cancel',
    tone: extras?.tone ?? (confirmLabel.toLowerCase().includes('discard') || confirmLabel.toLowerCase().includes('delete')
      ? 'danger'
      : 'default'),
  };
  if (host) return host(request);
  if (Platform.OS === 'web') {
    const prompt = typeof globalThis.confirm === 'function' ? globalThis.confirm(`${title}\n\n${message}`) : true;
    return Promise.resolve(Boolean(prompt));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: request.cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: request.tone === 'danger' ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}
