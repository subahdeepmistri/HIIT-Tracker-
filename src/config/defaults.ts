export const DEFAULTS = {
  countdownSeconds: 3,
  workSeconds: 40,
  restSeconds: 20,
  rounds: 5,
  transitionSeconds: 0,
  roundCompleteSeconds: 1.6,
  liveTickMs: 200,
  minTouchTarget: 48,
  liveTouchTarget: 64,
  dbVersion: 1,
  storageKey: '@hiit-tracker/db',
  legacyStorageKey: '@volt/db',
  sessionPersistKey: '@hiit-tracker/live-session',
  legacySessionPersistKey: '@volt/live-session',
} as const;

export const AUDIO_DEFAULTS = {
  soundEnabled: true,
  hapticsEnabled: true,
  countdownSound: true,
  restEndingAlert: true,
  completionSound: true,
  hapticIntervalChanges: true,
  hapticCountdown: true,
  hapticComplete: true,
} as const;
