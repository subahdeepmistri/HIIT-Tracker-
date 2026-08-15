import type { User, UserSettings, WorkoutPlan } from '../../domain/types';
import { plannedDurationForDraft } from '../../engine/workout/plannedDuration';
import { planWorkout } from '../../engine/workout/planner';
import { asId } from '../../domain/ids';

export const ONBOARDING_STEP_COUNT = 6;

export const WORK_PRESETS = [20, 30, 40, 45, 60] as const;
export const REST_PRESETS = [10, 15, 20, 30, 45] as const;
export const ROUND_PRESETS = [3, 4, 5, 6, 8] as const;

export const SKIP_DEFAULTS: Pick<
  UserSettings,
  | 'defaultWorkSeconds'
  | 'defaultRestSeconds'
  | 'defaultRounds'
  | 'soundEnabled'
  | 'hapticsEnabled'
  | 'countdownSound'
  | 'restEndingAlert'
  | 'completionSound'
  | 'hapticIntervalChanges'
  | 'hapticCountdown'
  | 'hapticComplete'
> = {
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
};

/** Bump this when the onboarding flow itself changes and existing users should see it once. */
export const ONBOARDING_VERSION = 2;

export function isOnboardingComplete(
  user: Pick<User, 'onboardingCompletedAt' | 'onboardingVersion'>,
): boolean {
  return Boolean(user.onboardingCompletedAt) && (user.onboardingVersion ?? 0) >= ONBOARDING_VERSION;
}

export function shouldApplySkipDefaults(
  user: Pick<User, 'onboardingCompletedAt'>,
): boolean {
  return !user.onboardingCompletedAt;
}

export function resetOnboarding(user: User): User {
  return {
    ...user,
    onboardingVersion: 0,
    onboardingStep: 0,
  };
}

export function clampOnboardingStep(step: number | undefined): number {
  if (step == null || !Number.isFinite(step)) return 0;
  return Math.max(0, Math.min(ONBOARDING_STEP_COUNT - 1, Math.floor(step)));
}

export function applySkipDefaults(settings: UserSettings): UserSettings {
  return { ...settings, ...SKIP_DEFAULTS };
}

export function markOnboardingComplete(user: User, now: number = Date.now()): User {
  return {
    ...user,
    onboardingCompletedAt: now,
    onboardingStep: undefined,
    onboardingVersion: ONBOARDING_VERSION,
  };
}

export function estimateDefaultSessionDuration(input: {
  workSeconds: number;
  restSeconds: number;
  rounds: number;
  countdownSeconds?: number;
}): number {
  return plannedDurationForDraft({
    name: 'Default intervals',
    rounds: input.rounds,
    countdownSeconds: input.countdownSeconds ?? 0,
    items: [
      {
        id: asId('onboarding-default'),
        workoutId: asId('onboarding-default'),
        exerciseId: asId('onboarding-default'),
        orderIndex: 0,
        trackingMode: 'TIME',
        plannedWorkSeconds: input.workSeconds,
        plannedRestSeconds: input.restSeconds,
      },
    ],
  });
}

export function morningHiitPreview(
  plan: WorkoutPlan,
  countdownSeconds: number,
): {
  name: string;
  rounds: number;
  exercises: number;
  workSeconds: number;
  restSeconds: number;
  durationSeconds: number;
} {
  const planned = planWorkout({
    workout: plan.workout,
    items: plan.exercises,
    countdownSeconds,
  });
  const works = plan.exercises.map((item) => item.plannedWorkSeconds);
  const rests = plan.exercises.map((item) => item.plannedRestSeconds);
  return {
    name: plan.workout.name,
    rounds: planned.rounds,
    exercises: planned.exerciseCount,
    workSeconds: mostCommon(works) ?? 40,
    restSeconds: mostCommon(rests) ?? 20,
    durationSeconds: planned.plannedDurationSeconds,
  };
}

function mostCommon(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const counts = new Map<number, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

export const MORNING_HIIT_ID = 'wo-morning-hiit';
