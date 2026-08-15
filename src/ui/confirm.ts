import { Alert, Platform } from 'react-native';

export function confirmAction(title: string, message: string, confirmLabel = 'Confirm'): Promise<boolean> {
  if (Platform.OS === 'web') {
    const prompt = typeof globalThis.confirm === 'function' ? globalThis.confirm(`${title}\n\n${message}`) : true;
    return Promise.resolve(Boolean(prompt));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
