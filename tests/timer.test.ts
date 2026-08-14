import { describe, expect, it } from 'vitest';

import { asId } from '../src/domain/ids';
import { FrozenClock, remainingMs } from '../src/engine/clock/timestampClock';
import { planWorkout } from '../src/engine/workout/planner';
import {
  getLiveView,
  pause,
  resume,
  skip,
  startWorkout,
  tick,
} from '../src/engine/workout/stateMachine';
import type { Exercise, Workout, WorkoutExercise } from '../src/domain/types';

describe('timestamp clock', () => {
  it('accounts for backgrounded time on a 10s interval', () => {
    const clock = new FrozenClock(1_000_000);
    const plan = oneWorkPlan(10);
    let state = startWorkout(plan, clock.now(), { roundCompleteSeconds: 0 });
    expect(state.phase).toBe('COUNTDOWN');
    clock.advance(3_000);
    state = tick(state, clock.now());
    expect(state.phase).toBe('WORK');
    const afterStart = getLiveView(state, clock.now());
    expect(afterStart.remainingMs).toBe(10_000);

    clock.advance(3_000);
    const afterBackground = getLiveView(state, clock.now());
    expect(afterBackground.remainingMs).toBe(7_000);
    expect(Math.abs(afterBackground.remainingMs - 7_000)).toBeLessThanOrEqual(16);
  });

  it('does not consume interval time while paused', () => {
    const clock = new FrozenClock(0);
    const plan = oneWorkPlan(10);
    let state = startWorkout(plan, clock.now(), { roundCompleteSeconds: 0 });
    clock.advance(3_000);
    state = tick(state, clock.now());
    state = pause(state, clock.now());
    clock.advance(2_000);
    const pausedView = getLiveView(state, clock.now());
    expect(pausedView.remainingMs).toBe(10_000);
    state = resume(state, clock.now());
    expect(getLiveView(state, clock.now()).remainingMs).toBe(10_000);
  });

  it('skip stores elapsed actual and leaves planned untouched', () => {
    const clock = new FrozenClock(0);
    const plan = oneWorkPlan(40);
    let state = startWorkout(plan, clock.now(), { roundCompleteSeconds: 0 });
    clock.advance(3_000);
    state = tick(state, clock.now());
    clock.advance(12_000);
    state = skip(state, clock.now());
    const work = state.intervals.find((row) => row.phase === 'WORK');
    expect(work?.plannedSeconds).toBe(40);
    expect(work?.actualSeconds).toBe(12);
    expect(work?.outcome).toBe('SKIPPED');
  });
});

describe('remainingMs', () => {
  it('never goes negative', () => {
    expect(remainingMs(100, 150)).toBe(0);
  });
});

function oneWorkPlan(workSeconds: number) {
  const workout: Workout = {
    id: asId('wo'),
    name: 'Test',
    notes: '',
    rounds: 1,
    isArchived: false,
    createdAt: 0,
    updatedAt: 0,
  };
  const exercise: Exercise = {
    id: asId('ex'),
    name: 'Sprint',
    category: 'Cardio',
    movementType: 'locomotion',
    equipment: ['none'],
    defaultWorkDurationSeconds: workSeconds,
    defaultRestDurationSeconds: 0,
    trackingMode: 'TIME',
    instructions: '',
    safetyNotes: '',
    difficulty: 1,
    isCustom: false,
    createdAt: 0,
    updatedAt: 0,
  };
  const item: WorkoutExercise & { exercise: Exercise } = {
    id: asId('we'),
    workoutId: workout.id,
    exerciseId: exercise.id,
    orderIndex: 0,
    trackingMode: 'TIME',
    plannedWorkSeconds: workSeconds,
    plannedRestSeconds: 0,
    exercise,
  };
  return planWorkout({ workout, items: [item], countdownSeconds: 3 });
}
