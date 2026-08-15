import { describe, expect, it } from 'vitest';

import { VIDEO_DEMO_IDS, demoIdForLiveView } from '../src/features/live/exerciseDemoLogic';

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
});
