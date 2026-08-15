import { describe, expect, it } from 'vitest';

import { asId } from '../src/domain/ids';
import type { Exercise, User, UserSettings, Workout, WorkoutExercise } from '../src/domain/types';
import {
  ONBOARDING_STEP_COUNT,
  SKIP_DEFAULTS,
  applySkipDefaults,
  clampOnboardingStep,
  estimateDefaultSessionDuration,
  isOnboardingComplete,
  markOnboardingComplete,
  morningHiitPreview,
} from '../src/features/onboarding/logic';
import { planWorkout } from '../src/engine/workout/planner';

function settings(partial: Partial<UserSettings> = {}): UserSettings {
  return {
    theme: 'dark',
    distanceUnit: 'km',
    countdownSeconds: 3,
    defaultWorkSeconds: 40,
    defaultRestSeconds: 20,
    defaultRounds: 5,
    soundEnabled: true,
    hapticsEnabled: true,
    countdownSound: true,
    restEndingAlert: true,
    completionSound: true,
    hapticIntervalChanges: true,
    hapticCountdown: true,
    hapticComplete: true,
    remindersEnabled: false,
    reminderHour: 7,
    reminderMinute: 0,
    reducedMotion: false,
    ...partial,
  };
}

function user(partial: Partial<User> = {}): User {
  return { id: asId('user-1'), createdAt: 1, ...partial };
}

describe('onboarding completion', () => {
  it('treats first launch as incomplete', () => {
    expect(isOnboardingComplete(user())).toBe(false);
  });

  it('marks completion and clears the saved step', () => {
    const next = markOnboardingComplete(user({ onboardingStep: 3 }), 1_700);
    expect(isOnboardingComplete(next)).toBe(true);
    expect(next.onboardingCompletedAt).toBe(1_700);
    expect(next.onboardingStep).toBeUndefined();
  });

  it('reopening after completion stays complete', () => {
    const next = markOnboardingComplete(user(), 2);
    expect(isOnboardingComplete(next)).toBe(true);
  });
});

describe('onboarding navigation state', () => {
  it('clamps back/forward within the 6 screens', () => {
    expect(clampOnboardingStep(-2)).toBe(0);
    expect(clampOnboardingStep(0)).toBe(0);
    expect(clampOnboardingStep(5)).toBe(5);
    expect(clampOnboardingStep(99)).toBe(ONBOARDING_STEP_COUNT - 1);
    expect(clampOnboardingStep(undefined)).toBe(0);
  });

  it('preserves custom selections when applying later completion', () => {
    const custom = settings({ defaultWorkSeconds: 30, defaultRestSeconds: 15, defaultRounds: 8 });
    const finished = markOnboardingComplete(user({ onboardingStep: 4 }));
    expect(custom.defaultWorkSeconds).toBe(30);
    expect(custom.defaultRestSeconds).toBe(15);
    expect(custom.defaultRounds).toBe(8);
    expect(isOnboardingComplete(finished)).toBe(true);
  });
});

describe('skip defaults', () => {
  it('resets work, rest, rounds, sound, and haptics to product defaults', () => {
    const next = applySkipDefaults(
      settings({
        defaultWorkSeconds: 60,
        defaultRestSeconds: 45,
        defaultRounds: 8,
        soundEnabled: false,
        hapticsEnabled: false,
      }),
    );
    expect(next.defaultWorkSeconds).toBe(SKIP_DEFAULTS.defaultWorkSeconds);
    expect(next.defaultRestSeconds).toBe(SKIP_DEFAULTS.defaultRestSeconds);
    expect(next.defaultRounds).toBe(SKIP_DEFAULTS.defaultRounds);
    expect(next.soundEnabled).toBe(true);
    expect(next.hapticsEnabled).toBe(true);
    expect(next.countdownSound).toBe(true);
    expect(next.hapticComplete).toBe(true);
  });

  it('does not drop unrelated settings', () => {
    const next = applySkipDefaults(settings({ theme: 'light', distanceUnit: 'mi' }));
    expect(next.theme).toBe('light');
    expect(next.distanceUnit).toBe('mi');
  });
});

describe('dynamic duration', () => {
  it('uses the workout planner, not a hardcoded string', () => {
    const duration = estimateDefaultSessionDuration({
      workSeconds: 40,
      restSeconds: 20,
      rounds: 5,
      countdownSeconds: 3,
    });
    const expected = planWorkout({
      workout: {
        id: asId('x'),
        name: 'Default session',
        notes: '',
        rounds: 5,
        isArchived: false,
        createdAt: 0,
        updatedAt: 0,
      },
      items: [
        {
          id: asId('we'),
          workoutId: asId('x'),
          exerciseId: asId('ex'),
          orderIndex: 0,
          trackingMode: 'TIME',
          plannedWorkSeconds: 40,
          plannedRestSeconds: 20,
          exercise: {
            id: asId('ex'),
            name: 'Exercise',
            category: 'Conditioning',
            movementType: 'dynamic',
            equipment: ['none'],
            defaultWorkDurationSeconds: 40,
            defaultRestDurationSeconds: 20,
            trackingMode: 'TIME',
            instructions: '',
            safetyNotes: '',
            difficulty: 1,
            isCustom: false,
            createdAt: 0,
            updatedAt: 0,
          },
        },
      ],
      countdownSeconds: 3,
    }).plannedDurationSeconds;
    expect(duration).toBe(expected);
    expect(duration).toBe(3 + 40 * 5 + 20 * 4);
  });

  it('recalculates when work/rest/rounds change', () => {
    const a = estimateDefaultSessionDuration({
      workSeconds: 20,
      restSeconds: 10,
      rounds: 3,
      countdownSeconds: 0,
    });
    const b = estimateDefaultSessionDuration({
      workSeconds: 60,
      restSeconds: 10,
      rounds: 3,
      countdownSeconds: 0,
    });
    expect(b).toBeGreaterThan(a);
  });
});

describe('morning HIIT preview', () => {
  it('reads duration from the actual template', () => {
    const workout: Workout = {
      id: asId('wo-morning-hiit'),
      name: 'Morning HIIT',
      notes: '',
      rounds: 5,
      isArchived: false,
      createdAt: 0,
      updatedAt: 0,
    };
    const exercise = (name: string, index: number): WorkoutExercise & { exercise: Exercise } => ({
      id: asId(`we-${index}`),
      workoutId: workout.id,
      exerciseId: asId(`ex-${index}`),
      orderIndex: index,
      trackingMode: 'TIME',
      plannedWorkSeconds: 40,
      plannedRestSeconds: 20,
      exercise: {
        id: asId(`ex-${index}`),
        name,
        category: 'Conditioning',
        movementType: 'dynamic',
        equipment: ['none'],
        defaultWorkDurationSeconds: 40,
        defaultRestDurationSeconds: 20,
        trackingMode: 'TIME',
        instructions: '',
        safetyNotes: '',
        difficulty: 1,
        isCustom: false,
        createdAt: 0,
        updatedAt: 0,
      },
    });
    const plan = {
      workout,
      exercises: [exercise('A', 0), exercise('B', 1)],
    };
    const preview = morningHiitPreview(plan, 3);
    expect(preview.name).toBe('Morning HIIT');
    expect(preview.rounds).toBe(5);
    expect(preview.exercises).toBe(2);
    expect(preview.workSeconds).toBe(40);
    expect(preview.restSeconds).toBe(20);
    expect(preview.durationSeconds).toBe(planWorkout({ workout, items: plan.exercises, countdownSeconds: 3 }).plannedDurationSeconds);
  });
});
