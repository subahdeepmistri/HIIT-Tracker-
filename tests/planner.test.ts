import { describe, expect, it } from 'vitest';

import { asId } from '../src/domain/ids';
import type { Exercise, Workout, WorkoutExercise } from '../src/domain/types';
import { planWorkout } from '../src/engine/workout/planner';
import { validateWorkoutDraft } from '../src/domain/validation';

describe('planner', () => {
  it('omits rest after the final interval and includes countdown', () => {
    const plan = planWorkout({
      workout: workout(2),
      items: [item(0, 40, 20), item(1, 40, 20)],
      countdownSeconds: 3,
    });
    const last = plan.slots[plan.slots.length - 1];
    expect(last.phase).toBe('WORK');
    expect(plan.plannedDurationSeconds).toBe(3 + 40 * 4 + 20 * 3);
  });

  it('rejects negative and empty drafts', () => {
    expect(validateWorkoutDraft({ name: '', rounds: 0, exercises: [] }).ok).toBe(false);
    expect(
      validateWorkoutDraft({
        name: 'X',
        rounds: 1,
        exercises: [{ plannedWorkSeconds: -1, plannedRestSeconds: 20 }],
      }).ok,
    ).toBe(false);
  });
});

function workout(rounds: number): Workout {
  return {
    id: asId('w'),
    name: 'Circuit',
    notes: '',
    rounds,
    isArchived: false,
    createdAt: 0,
    updatedAt: 0,
  };
}

function item(orderIndex: number, work: number, rest: number): WorkoutExercise & { exercise: Exercise } {
  const exercise: Exercise = {
    id: asId(`e${orderIndex}`),
    name: `Move ${orderIndex}`,
    category: 'Conditioning',
    movementType: 'dynamic',
    equipment: ['none'],
    defaultWorkDurationSeconds: work,
    defaultRestDurationSeconds: rest,
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
    plannedWorkSeconds: work,
    plannedRestSeconds: rest,
    exercise,
  };
}
