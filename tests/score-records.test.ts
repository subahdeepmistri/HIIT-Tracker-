import { describe, expect, it } from 'vitest';

import { asId } from '../src/domain/ids';
import type { IntervalSession, WorkoutSession } from '../src/domain/types';
import { detectPersonalRecords } from '../src/engine/records/personalRecords';
import { performanceScore } from '../src/engine/score/performanceScore';

describe('performanceScore', () => {
  it('renormalizes when reps are missing', () => {
    const metric = performanceScore({
      plannedWorkSeconds: 100,
      actualWorkSeconds: 80,
      plannedWorkIntervals: 4,
      completedWorkIntervals: 4,
      plannedRounds: 4,
      completedRounds: 4,
    });
    expect(metric.kind).toBe('value');
    if (metric.kind === 'value') {
      expect(metric.value.components.some((row) => row.key === 'repScore')).toBe(false);
      const weightSum = metric.value.components.reduce((sum, row) => sum + row.renormalizedWeight, 0);
      expect(weightSum).toBeCloseTo(1);
      expect(metric.value.total).toBeCloseTo((80 / 100) * 100 * (0.4 / 0.8) + 100 * (0.25 / 0.8) + 100 * (0.15 / 0.8));
    }
  });

  it('returns insufficient when nothing can be scored', () => {
    const metric = performanceScore({
      plannedWorkSeconds: 0,
      actualWorkSeconds: 0,
      plannedWorkIntervals: 0,
      completedWorkIntervals: 0,
      plannedRounds: 0,
      completedRounds: 0,
    });
    expect(metric.kind).toBe('insufficient');
  });
});

describe('personal records', () => {
  it('does not create a PR from skipped or zero data', () => {
    const session = baseSession();
    const intervals: IntervalSession[] = [
      {
        id: asId('i1'),
        sessionId: session.id,
        exerciseId: asId('ex'),
        exerciseNameSnapshot: 'Squats',
        roundIndex: 1,
        exerciseIndex: 0,
        phase: 'WORK',
        plannedSeconds: 40,
        actualSeconds: 0,
        actualReps: 0,
        startedAt: 0,
        endedAt: 1,
        outcome: 'SKIPPED',
      },
    ];
    const earned = detectPersonalRecords({ session, intervals, existing: [] });
    expect(earned).toEqual([]);
  });

  it('creates a longest-work PR from a completed interval', () => {
    const session = baseSession();
    const intervals: IntervalSession[] = [
      {
        id: asId('i1'),
        sessionId: session.id,
        exerciseId: asId('ex'),
        exerciseNameSnapshot: 'Plank',
        roundIndex: 1,
        exerciseIndex: 0,
        phase: 'WORK',
        plannedSeconds: 40,
        actualSeconds: 40,
        startedAt: 0,
        endedAt: 40_000,
        outcome: 'COMPLETED',
      },
    ];
    const earned = detectPersonalRecords({ session, intervals, existing: [] });
    expect(earned.some((row) => row.kind === 'LONGEST_WORK_INTERVAL' && row.value === 40)).toBe(true);
  });
});

function baseSession(): WorkoutSession {
  return {
    id: asId('s1'),
    workoutId: asId('w1'),
    workoutNameSnapshot: 'Test',
    status: 'COMPLETED',
    startedAt: 0,
    endedAt: 40_000,
    countdownSecondsUsed: 0,
    plannedRounds: 1,
    plannedExerciseCount: 1,
  };
}
