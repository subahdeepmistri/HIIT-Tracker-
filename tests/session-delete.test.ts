import { describe, expect, it } from 'vitest';

import { applySessionDelete } from '../src/data/deleteSession';
import { asId } from '../src/domain/ids';
import type { IntervalSession, PerformanceRecord, PersonalRecord, WorkoutSession } from '../src/domain/types';
import type { VoltSnapshot } from '../src/data/schema';

function session(id: string, endedAt: number, status: WorkoutSession['status'] = 'COMPLETED'): WorkoutSession {
  return {
    id: asId(id),
    workoutId: asId('wo-morning-hiit'),
    workoutNameSnapshot: 'Morning HIIT',
    status,
    startedAt: endedAt - 60_000,
    endedAt,
    countdownSecondsUsed: 3,
    plannedRounds: 5,
    plannedExerciseCount: 6,
  };
}

function interval(sessionId: string, actualSeconds: number): IntervalSession {
  return {
    id: asId(`i-${sessionId}`),
    sessionId: asId(sessionId),
    exerciseId: asId('ex-squats'),
    exerciseNameSnapshot: 'Squats',
    roundIndex: 1,
    exerciseIndex: 0,
    phase: 'WORK',
    plannedSeconds: 40,
    actualSeconds,
    startedAt: 0,
    endedAt: actualSeconds * 1000,
    outcome: 'COMPLETED',
  };
}

function performance(sessionId: string, percent: number): PerformanceRecord {
  return {
    id: asId(`p-${sessionId}`),
    sessionId: asId(sessionId),
    workoutId: asId('wo-morning-hiit'),
    createdAt: 1,
    totalDurationSeconds: 40,
    totalActiveSeconds: 40,
    totalRestSeconds: 0,
    exerciseCount: 1,
    completedRounds: 1,
    completedIntervals: 1,
    plannedWorkSeconds: 40,
    plannedRestSeconds: 0,
    workCompletionPercent: percent,
  };
}

describe('applySessionDelete', () => {
  it('removes the session, intervals, and performance locally and rebuilds PRs', () => {
    const keep = session('keep', 2_000);
    const drop = session('drop', 1_000);
    const snapshot: VoltSnapshot = {
      ...bareSnapshot(),
      sessions: [keep, drop],
      intervals: [interval('keep', 40), interval('drop', 10)],
      performanceRecords: [performance('keep', 100), performance('drop', 2)],
      personalRecords: [
        {
          id: asId('pr1'),
          kind: 'LONGEST_WORK_INTERVAL',
          value: 10,
          unit: 's',
          sessionId: drop.id,
          earnedAt: 1_000,
        } satisfies PersonalRecord,
      ],
      trainingDays: [{ date: '2026-08-16', status: 'COMPLETED', sessionIds: [keep.id, drop.id] }],
    };

    const next = applySessionDelete(snapshot, asId('drop'));

    expect(next.sessions.map((row) => row.id)).toEqual([keep.id]);
    expect(next.intervals.every((row) => row.sessionId === keep.id)).toBe(true);
    expect(next.performanceRecords.map((row) => row.sessionId)).toEqual([keep.id]);
    expect(next.personalRecords.some((row) => row.sessionId === drop.id)).toBe(false);
    expect(next.personalRecords.some((row) => row.kind === 'LONGEST_WORK_INTERVAL' && row.value === 40)).toBe(
      true,
    );
    expect(next.trainingDays[0]?.sessionIds).toEqual([keep.id]);
  });

  it('leaves planned workouts untouched', () => {
    const snapshot = bareSnapshot();
    const next = applySessionDelete(
      {
        ...snapshot,
        sessions: [session('drop', 1_000)],
        intervals: [interval('drop', 4)],
      },
      asId('drop'),
    );
    expect(next.sessions).toEqual([]);
    expect(next.workouts).toEqual(snapshot.workouts);
  });
});

function bareSnapshot(): VoltSnapshot {
  return {
    version: 2,
    user: { id: asId('user'), createdAt: 1 },
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
    workouts: [
      {
        id: asId('wo-morning-hiit'),
        name: 'Morning HIIT',
        notes: '',
        rounds: 5,
        isArchived: false,
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    workoutExercises: [],
    sessions: [],
    intervals: [],
    performanceRecords: [],
    personalRecords: [],
    trainingDays: [],
  };
}
