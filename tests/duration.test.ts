import { describe, expect, it } from 'vitest';

import { asId } from '../src/domain/ids';
import { Units } from '../src/domain/units';
import { calculateTrainingDurationFromRecorded } from '../src/engine/calc/metrics';
import type { Exercise, Workout, WorkoutExercise } from '../src/domain/types';
import {
  calculateRestDuration,
  calculateTrainingDuration,
  calculateWorkDuration,
  planWorkout,
} from '../src/engine/workout/planner';
import { estimateDefaultSessionDuration } from '../src/features/onboarding/logic';

describe('formatCompactDuration', () => {
  it('formats under a minute as seconds', () => {
    expect(Units.formatCompactDuration(40)).toBe('40s');
  });

  it('keeps remaining seconds under an hour', () => {
    expect(Units.formatCompactDuration(80)).toBe('1m 20s');
    expect(Units.formatCompactDuration(280)).toBe('4m 40s');
    expect(Units.formatCompactDuration(1780)).toBe('29m 40s');
  });

  it('formats hours without dropping the minute remainder', () => {
    expect(Units.formatCompactDuration(4320)).toBe('1h 12m');
  });
});

describe('calculateTrainingDuration', () => {
  it('uses default onboarding intervals without countdown', () => {
    const withCountdown = estimateDefaultSessionDuration({
      workSeconds: 40,
      restSeconds: 20,
      rounds: 5,
      countdownSeconds: 3,
    });
    const withoutCountdown = estimateDefaultSessionDuration({
      workSeconds: 40,
      restSeconds: 20,
      rounds: 5,
      countdownSeconds: 0,
    });
    expect(withCountdown).toBe(280);
    expect(withoutCountdown).toBe(280);
    expect(Units.formatCompactDuration(withCountdown)).toBe('4m 40s');
    expect(Units.formatCompactDuration(withCountdown)).not.toBe('4m 43s');
  });

  it('calculates Morning HIIT as 29m 40s and excludes countdown', () => {
    const plan = planWorkout({
      workout: {
        id: asId('w'),
        name: 'Morning HIIT',
        notes: '',
        rounds: 5,
        isArchived: false,
        createdAt: 0,
        updatedAt: 0,
      } as Workout,
      items: [0, 1, 2, 3, 4, 5].map((index) => item(index)),
      countdownSeconds: 3,
    });
    expect(calculateWorkDuration(plan)).toBe(1200);
    expect(calculateRestDuration(plan)).toBe(580);
    expect(calculateTrainingDuration(plan)).toBe(1780);
    expect(plan.countdownSeconds).toBe(3);
    expect(Units.formatCompactDuration(calculateTrainingDuration(plan))).toBe('29m 40s');
  });

  it('excludes the final rest from recorded training duration', () => {
    expect(calculateTrainingDurationFromRecorded(200, 80)).toBe(280);
    expect(calculateTrainingDurationFromRecorded(1200, 580)).toBe(1780);
  });
});

function item(orderIndex: number): WorkoutExercise & { exercise: Exercise } {
  const exercise: Exercise = {
    id: asId(`e${orderIndex}`),
    name: `Move ${orderIndex}`,
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
  };
  return {
    id: asId(`we${orderIndex}`),
    workoutId: asId('w'),
    exerciseId: exercise.id,
    orderIndex,
    trackingMode: 'TIME',
    plannedWorkSeconds: 40,
    plannedRestSeconds: 20,
    exercise,
  };
}
