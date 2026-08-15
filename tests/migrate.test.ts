import { describe, expect, it } from 'vitest';

import { asId } from '../src/domain/ids';
import type { IntervalSession, PerformanceRecord } from '../src/domain/types';
import { applyMigrations, recalculateTrainingDurations } from '../src/data/migrate';
import type { VoltSnapshot } from '../src/data/schema';

describe('duration migration', () => {
  it('rewrites wall-clock performance duration to recorded training duration', () => {
    const records: PerformanceRecord[] = [
      {
        id: asId('perf-1'),
        sessionId: asId('session-1'),
        workoutId: asId('wo-1'),
        createdAt: 43_000,
        totalDurationSeconds: 43,
        totalActiveSeconds: 40,
        totalRestSeconds: 0,
        exerciseCount: 1,
        completedRounds: 1,
        completedIntervals: 1,
        plannedWorkSeconds: 40,
        plannedRestSeconds: 0,
      },
    ];
    const intervals: IntervalSession[] = [
      {
        id: asId('int-1'),
        sessionId: asId('session-1'),
        exerciseId: asId('ex-1'),
        exerciseNameSnapshot: 'Sprint',
        roundIndex: 1,
        exerciseIndex: 0,
        phase: 'WORK',
        plannedSeconds: 40,
        actualSeconds: 40,
        startedAt: 3_000,
        endedAt: 43_000,
        outcome: 'COMPLETED',
      },
    ];
    const [next] = recalculateTrainingDurations({ intervals, performanceRecords: records });
    expect(next?.totalDurationSeconds).toBe(40);
    expect(next?.totalDurationSeconds).not.toBe(43);
  });

  it('upgrades a v1 snapshot without dropping sessions', () => {
    const snapshot = baseSnapshot();
    snapshot.version = 1;
    snapshot.sessions = [
      {
        id: asId('session-1'),
        workoutId: asId('wo-1'),
        workoutNameSnapshot: 'Morning HIIT',
        status: 'COMPLETED',
        startedAt: 0,
        endedAt: 43_000,
        countdownSecondsUsed: 3,
        plannedRounds: 1,
        plannedExerciseCount: 1,
      },
    ];
    snapshot.intervals = [
      {
        id: asId('int-1'),
        sessionId: asId('session-1'),
        exerciseId: asId('ex-1'),
        exerciseNameSnapshot: 'Sprint',
        roundIndex: 1,
        exerciseIndex: 0,
        phase: 'WORK',
        plannedSeconds: 40,
        actualSeconds: 40,
        startedAt: 3_000,
        endedAt: 43_000,
        outcome: 'COMPLETED',
      },
    ];
    snapshot.performanceRecords = [
      {
        id: asId('perf-1'),
        sessionId: asId('session-1'),
        workoutId: asId('wo-1'),
        createdAt: 43_000,
        totalDurationSeconds: 43,
        totalActiveSeconds: 40,
        totalRestSeconds: 0,
        exerciseCount: 1,
        completedRounds: 1,
        completedIntervals: 1,
        plannedWorkSeconds: 40,
        plannedRestSeconds: 0,
      },
    ];

    const migrated = applyMigrations(snapshot);
    expect(migrated.version).toBe(2);
    expect(migrated.sessions).toHaveLength(1);
    expect(migrated.performanceRecords[0]?.totalDurationSeconds).toBe(40);
  });
});

function baseSnapshot(): VoltSnapshot {
  return {
    version: 1,
    user: { id: asId('user-1'), createdAt: 0 },
    settings: {
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
      remindersEnabled: false,
      reminderHour: 7,
      reminderMinute: 0,
      reducedMotion: false,
    },
    exercises: [],
    workouts: [],
    workoutExercises: [],
    sessions: [],
    intervals: [],
    performanceRecords: [],
    personalRecords: [],
    trainingDays: [],
  };
}
