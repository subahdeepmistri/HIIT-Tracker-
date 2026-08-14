import { Platform } from 'react-native';

import type { UserSettings } from '../domain/types';

type CueKind = 'countdown' | 'work' | 'restEnding' | 'complete' | 'tap';

export async function playCue(kind: CueKind, settings: UserSettings): Promise<void> {
  if (settings.hapticsEnabled) {
    await haptic(kind);
  }
  if (!settings.soundEnabled) return;
  if (kind === 'countdown' && !settings.countdownSound) return;
  if (kind === 'restEnding' && !settings.restEndingAlert) return;
  if (kind === 'complete' && !settings.completionSound) return;
  beep(kind);
}

async function haptic(kind: CueKind): Promise<void> {
  try {
    const Haptics = await import('expo-haptics');
    if (kind === 'complete') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    if (kind === 'restEnding' || kind === 'work') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Native module unavailable (tests / some web targets).
  }
}

function beep(kind: CueKind): void {
  if (Platform.OS !== 'web') return;
  const audioWindow = globalThis as typeof globalThis & {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
  if (!Ctor) return;
  const ctx = new Ctor();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const freq = kind === 'complete' ? 660 : kind === 'restEnding' ? 520 : kind === 'work' ? 440 : 330;
  osc.frequency.value = freq;
  osc.type = 'sine';
  gain.gain.value = 0.05;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.12);
  osc.onended = () => {
    void ctx.close();
  };
}
