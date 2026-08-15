import { describe, expect, it } from 'vitest';

import { asId } from '../src/domain/ids';
import type { Exercise, Workout, WorkoutExercise } from '../src/domain/types';
import { planWorkout } from '../src/engine/workout/planner';
import { recordReps, skip, startWorkout, tick } from '../src/engine/workout/stateMachine';

describe('planned vs actual integrity', () => {
  it('never mutates the workout template object during a session', () => {
    const template = {
      workout: {
        id: asId('wo'),
        name: 'Morning HIIT',
        notes: '',
        rounds: 1,
        isArchived: false,
        createdAt: 1,
        updatedAt: 1,
      } as Workout,
      items: [
        {
          id: asId('we'),
          workoutId: asId('wo'),
          exerciseId: asId('ex'),
          orderIndex: 0,
          trackingMode: 'REPS',
          plannedWorkSeconds: 40,
          plannedRestSeconds: 20,
          plannedReps: 15,
          exercise: {
            id: asId('ex'),
            name: 'Squats',
            category: 'Lower Body',
            movementType: 'strength',
            equipment: ['none'],
            defaultWorkDurationSeconds: 40,
            defaultRestDurationSeconds: 20,
            trackingMode: 'REPS',
            instructions: '',
            safetyNotes: '',
            difficulty: 2,
            isCustom: false,
            createdAt: 1,
            updatedAt: 1,
          } as Exercise,
        } as WorkoutExercise & { exercise: Exercise },
      ],
      countdownSeconds: 0,
    };
    const plannedBefore = { ...template.items[0] };
    let state = startWorkout(planWorkout(template), 0, { roundCompleteSeconds: 0 });
    state = recordReps(state, 9);
    state = tick(state, 10_000);
    state = skip(state, 12_000);
    expect(template.items[0].plannedWorkSeconds).toBe(plannedBefore.plannedWorkSeconds);
    expect(template.items[0].plannedReps).toBe(15);
    expect(template.workout.rounds).toBe(1);
    expect(state.intervals[0]?.plannedReps).toBe(15);
    expect(state.intervals[0]?.actualReps).toBe(9);
    expect(state.intervals[0]?.plannedSeconds).toBe(40);
    expect(state.intervals[0]?.actualSeconds).toBe(12);
  });
});
