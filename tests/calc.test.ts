import { describe, expect, it } from 'vitest';

import { asId } from '../src/domain/ids';
import type { IntervalSession, WorkoutSession } from '../src/domain/types';
import { completionPercent } from '../src/engine/calc/completion';
import { calculateSessionMetrics } from '../src/engine/calc/metrics';
import { workRestRatio } from '../src/engine/calc/ratio';

describe('completionPercent', () => {
  it('computes 87.5% from 35/40', () => {
    const metric = completionPercent(40, 35);
    expect(metric).toEqual({ kind: 'value', value: 87.5 });
  });

  it('computes 90% from 18/20 reps', () => {
    const metric = completionPercent(20, 18);
    expect(metric).toEqual({ kind: 'value', value: 90 });
  });

  it('returns insufficient when planned is 0', () => {
    expect(completionPercent(0, 0).kind).toBe('insufficient');
    expect(completionPercent(0, 10).kind).toBe('insufficient');
  });

  it('returns insufficient for missing or negative values', () => {
    expect(completionPercent(undefined, 10).kind).toBe('insufficient');
    expect(completionPercent(10, undefined).kind).toBe('insufficient');
    expect(completionPercent(-10, 5).kind).toBe('insufficient');
    expect(completionPercent(10, -1).kind).toBe('insufficient');
  });
});

describe('workRestRatio', () => {
  it('computes 2 : 1 from 200/100', () => {
    const metric = workRestRatio(200, 100);
    expect(metric.kind).toBe('value');
    if (metric.kind === 'value') {
      expect(metric.value.ratio).toBe(2);
      expect(metric.value.display).toBe('2 : 1');
      expect(metric.value.label).toBe('High work density');
    }
  });

  it('labels continuous work when rest is 0 and work exists', () => {
    const metric = workRestRatio(120, 0);
    expect(metric.kind).toBe('value');
    if (metric.kind === 'value') {
      expect(metric.value.label).toBe('Continuous work');
    }
  });

  it('returns insufficient when both sides are 0', () => {
    expect(workRestRatio(0, 0).kind).toBe('insufficient');
  });
});

describe('calculateSessionMetrics', () => {
  it('does not invent reps when none were recorded', () => {
    const session = baseSession();
    const intervals = [workInterval({ actualSeconds: 35, plannedSeconds: 40 })];
    const metrics = calculateSessionMetrics(session, intervals, session.endedAt);
    expect(metrics.totalReps.kind).toBe('insufficient');
    expect(metrics.averageRepsPerInterval.kind).toBe('insufficient');
    expect(metrics.workCompletionPercent).toEqual({ kind: 'value', value: 87.5 });
  });

  it('handles skipped and partial intervals without crashing', () => {
    const session = baseSession();
    const intervals = [
      workInterval({ actualSeconds: 40, plannedSeconds: 40, outcome: 'COMPLETED' }),
      workInterval({
        id: asId('int-2'),
        actualSeconds: 12,
        plannedSeconds: 40,
        outcome: 'SKIPPED',
        startedAt: 2_000,
        endedAt: 14_000,
      }),
    ];
    const metrics = calculateSessionMetrics(session, intervals, session.endedAt);
    expect(metrics.completedIntervals).toEqual({ kind: 'value', value: 1 });
    expect(metrics.totalActiveSeconds.kind).toBe('value');
  });
});

function baseSession(): WorkoutSession {
  return {
    id: asId('session-1'),
    workoutId: asId('wo-1'),
    workoutNameSnapshot: 'Morning HIIT',
    status: 'COMPLETED',
    startedAt: 0,
    endedAt: 80_000,
    countdownSecondsUsed: 3,
    plannedRounds: 1,
    plannedExerciseCount: 2,
  };
}

function workInterval(partial: Partial<IntervalSession>): IntervalSession {
  return {
    id: asId('int-1'),
    sessionId: asId('session-1'),
    exerciseId: asId('ex-1'),
    exerciseNameSnapshot: 'Squats',
    roundIndex: 1,
    exerciseIndex: 0,
    phase: 'WORK',
    plannedSeconds: 40,
    actualSeconds: 40,
    startedAt: 0,
    endedAt: 40_000,
    outcome: 'COMPLETED',
    ...partial,
  };
}
