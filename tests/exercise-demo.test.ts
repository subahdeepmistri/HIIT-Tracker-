import { describe, expect, it } from 'vitest';

import {
  VIDEO_DEMO_IDS,
  canPlayDemoVideo,
  demoIdForLiveView,
  shouldAnimateDemoFrames,
} from '../src/features/live/exerciseDemoLogic';

describe('demoIdForLiveView', () => {
  it('shows the current exercise during work and countdown', () => {
    expect(
      demoIdForLiveView({ phase: 'WORK', currentExerciseId: 'ex-high-knees', nextExerciseId: 'ex-squats' }),
    ).toBe('ex-high-knees');
    expect(
      demoIdForLiveView({ phase: 'COUNTDOWN', currentExerciseId: 'ex-high-knees', nextExerciseId: 'ex-squats' }),
    ).toBe('ex-high-knees');
  });

  it('shows the next exercise during rest so the user can prepare', () => {
    expect(
      demoIdForLiveView({ phase: 'REST', currentExerciseId: 'ex-high-knees', nextExerciseId: 'ex-mountain-climbers' }),
    ).toBe('ex-mountain-climbers');
  });

  it('registers looping videos for the dynamic Morning HIIT movements', () => {
    expect([...VIDEO_DEMO_IDS]).toEqual([
      'ex-high-knees',
      'ex-mountain-climbers',
      'ex-squats',
      'ex-push-ups',
      'ex-burpees',
    ]);
  });

  it('never uses expo-av video on web, where bundled MP4s render as an empty box', () => {
    expect(canPlayDemoVideo('web', true)).toBe(false);
    expect(canPlayDemoVideo('ios', true)).toBe(true);
    expect(canPlayDemoVideo('android', true)).toBe(true);
    expect(canPlayDemoVideo('ios', false)).toBe(false);
  });

  it('keeps the JPEG flipbook running unless a native video is covering it', () => {
    expect(shouldAnimateDemoFrames({ frameCount: 2, intervalMs: 340 })).toBe(true);
    expect(shouldAnimateDemoFrames({ frameCount: 2, intervalMs: 340, reducedMotion: true })).toBe(false);
    expect(shouldAnimateDemoFrames({ frameCount: 2, intervalMs: 340, videoCovering: true })).toBe(false);
    expect(shouldAnimateDemoFrames({ frameCount: 1, intervalMs: 340 })).toBe(false);
  });
});
