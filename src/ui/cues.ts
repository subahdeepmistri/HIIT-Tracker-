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
  await beep(kind);
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

async function beep(kind: CueKind): Promise<void> {
  if (Platform.OS === 'web') {
    webBeep(kind);
    return;
  }
  await nativeBeep(kind);
}

function webBeep(kind: CueKind): void {
  const audioWindow = globalThis as typeof globalThis & {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
  if (!Ctor) return;
  const ctx = new Ctor();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = frequencyFor(kind);
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

async function nativeBeep(kind: CueKind): Promise<void> {
  try {
    const { Audio } = await import('expo-av');
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
    });
    const sound = new Audio.Sound();
    await sound.loadAsync({ uri: toneDataUri(frequencyFor(kind)) }, { shouldPlay: true });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded || !status.didJustFinish) return;
      void sound.unloadAsync();
    });
  } catch {
    // Sound is optional. Haptics may still have fired.
  }
}

function frequencyFor(kind: CueKind): number {
  if (kind === 'complete') return 660;
  if (kind === 'restEnding') return 520;
  if (kind === 'work') return 440;
  return 330;
}

function toneDataUri(frequency: number): string {
  const sampleRate = 8000;
  const duration = 0.12;
  const samples = Math.floor(sampleRate * duration);
  const dataSize = samples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < samples; i += 1) {
    const sample = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 0.25;
    view.setInt16(44 + i * 2, Math.round(sample * 32767), true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${globalThis.btoa(binary)}`;
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}
