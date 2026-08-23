import { describe, expect, it } from 'vitest';

import { asId } from '../src/domain/ids';
import type { IntervalSession, WorkoutSession } from '../src/domain/types';
import {
  aggregateSessionProgress,
  buildSessionProgress,
} from '../src/engine/analytics/sessionProgress';

describe('buildSessionProgress', () => {
  it('maps recorded work, intervals, and rounds into bars without inventing reps', () => {
    const snapshot = buildSessionProgress(
      session({ plannedRounds: 2, plannedExerciseCount: 1 }),
      [
        work({ actualSeconds: 35, plannedSeconds: 40, roundIndex: 1, outcome: 'COMPLETED' }),
        work({
          id: asId('int-2'),
          actualSeconds: 20,
          plannedSeconds: 40,
          roundIndex: 2,
          outcome: 'PARTIAL',
          startedAt: 40_000,
          endedAt: 60_000,
        }),
      ],
      80_000,
    );

    const workBar = byKey(snapshot.tracks, 'work');
    const intervalBar = byKey(snapshot.tracks, 'intervals');
    const roundBar = byKey(snapshot.tracks, 'rounds');
    const repsBar = byKey(snapshot.tracks, 'reps');
    const distanceBar = byKey(snapshot.tracks, 'distance');

    expect(workBar.value).toBeCloseTo(55 / 80);
    expect(workBar.caption).toBe('55s / 1m 20s');
    expect(intervalBar.value).toBe(0.5);
    expect(intervalBar.caption).toBe('1 / 2');
    expect(roundBar.value).toBe(0.5);
    expect(roundBar.caption).toBe('1 / 2');
    expect(repsBar.value).toBeNull();
    expect(repsBar.detail).toBe('Not enough data');
    expect(distanceBar.value).toBeNull();
    expect(snapshot.intervals).toHaveLength(2);
    expect(snapshot.scoreParts.some((part) => part.key === 'completionScore')).toBe(true);
  });

  it('builds interval time, reps, and distance bars only from recorded values', () => {
    const snapshot = buildSessionProgress(
      session({ plannedRounds: 1, plannedExerciseCount: 1 }),
      [
        work({
          plannedSeconds: 40,
          actualSeconds: 40,
          plannedReps: 20,
          actualReps: 18,
          plannedDistance: 100,
          actualDistance: 80,
          distanceUnit: 'm',
        }),
      ],
      80_000,
    );
    const interval = snapshot.intervals[0];
    expect(byKey(interval.tracks, 'time').value).toBe(1);
    expect(byKey(interval.tracks, 'reps').caption).toBe('18 / 20');
    expect(byKey(interval.tracks, 'distance').value).toBe(0.8);
    expect(byKey(snapshot.tracks, 'reps').value).toBe(0.9);
    expect(byKey(snapshot.tracks, 'distance').value).toBe(0.8);
  });

  it('keeps a recorded zero as a real empty bar, not missing data', () => {
    const snapshot = buildSessionProgress(
      session({ plannedRounds: 1, plannedExerciseCount: 1 }),
      [work({ plannedReps: 20, actualReps: 0, actualSeconds: 40, plannedSeconds: 40 })],
      80_000,
    );
    expect(byKey(snapshot.tracks, 'reps').value).toBe(0);
    expect(byKey(snapshot.tracks, 'reps').caption).toBe('0 / 20');
  });
});

describe('aggregateSessionProgress', () => {
  it('averages session percents and keeps planned-work volume as a sum ratio', () => {
    const first = buildSessionProgress(
      session({ id: asId('s1'), plannedRounds: 2 }),
      [work({ actualSeconds: 40, plannedSeconds: 40, outcome: 'COMPLETED' })],
      80_000,
    );
    const second = buildSessionProgress(
      session({ id: asId('s2'), plannedRounds: 2 }),
      [
        work({
          id: asId('int-b'),
          sessionId: asId('s2'),
          actualSeconds: 20,
          plannedSeconds: 40,
          outcome: 'PARTIAL',
        }),
      ],
      80_000,
    );
    const aggregated = aggregateSessionProgress([first, second]);
    expect(byKey(aggregated.tracks, 'work').value).toBeCloseTo(0.75);
    expect(byKey(aggregated.tracks, 'plannedWork').value).toBeCloseTo(60 / 80);
    expect(byKey(aggregated.tracks, 'plannedWork').detail).toBe('1m / 1m 20s');
    expect(aggregated.sessionCount).toBe(2);
  });

  it('does not invent aggregate bars when no sessions exist', () => {
    const aggregated = aggregateSessionProgress([]);
    expect(aggregated.sessionCount).toBe(0);
    expect(aggregated.tracks.every((track) => track.value == null)).toBe(true);
    expect(aggregated.workRest.display).toBe('Not enough data');
  });
});

function byKey(tracks: Array<{ key: string }>, key: string) {
  const found = tracks.find((track) => track.key === key);
  if (!found) throw new Error(`missing track ${key}`);
  return found as { key: string; label: string; detail: string; caption?: string; value: number | null };
}

function session(partial: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: asId('session-1'),
    workoutId: asId('wo-1'),
    workoutNameSnapshot: 'Morning HIIT',
    status: 'COMPLETED',
    startedAt: 0,
    endedAt: 80_000,
    countdownSecondsUsed: 3,
    plannedRounds: 1,
    plannedExerciseCount: 1,
    ...partial,
  };
}

function work(partial: Partial<IntervalSession> = {}): IntervalSession {
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
