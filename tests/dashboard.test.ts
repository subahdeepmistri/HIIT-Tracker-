import { describe, expect, it } from 'vitest';

import { asId } from '../src/domain/ids';
import type { PerformanceRecord, WorkoutSession } from '../src/domain/types';
import { currentStreak, dashboardStats, trendPoints } from '../src/engine/analytics/dashboard';
import { recoveryGuidance } from '../src/engine/recovery/guidance';

describe('dashboardStats', () => {
  it('returns empty-safe stats when there is no history', () => {
    const stats = dashboardStats([], [], Date.now());
    expect(stats.workoutsCompleted).toBe(0);
    expect(stats.totalTrainingSeconds).toBe(0);
    expect(stats.averageDurationSeconds).toBeNull();
    expect(stats.averageCompletion).toBeNull();
    expect(stats.streak).toBe(0);
  });

  it('does not interpolate missing days in trends', () => {
    const day1 = Date.parse('2026-08-01T12:00:00');
    const day3 = Date.parse('2026-08-03T12:00:00');
    const sessions = [session('s1', day1), session('s2', day3)];
    const performance = [perf('s1', 100, 90), perf('s2', 200, 80)];
    const points = trendPoints(sessions, performance, 'all', day3, 'completion');
    expect(points.map((point) => point.value)).toEqual([90, 80]);
    expect(points).toHaveLength(2);
  });
});

describe('currentStreak', () => {
  it('counts consecutive completed days only', () => {
    const now = Date.parse('2026-08-15T18:00:00');
    const sessions = [
      session('a', Date.parse('2026-08-15T08:00:00')),
      session('b', Date.parse('2026-08-14T08:00:00')),
      session('c', Date.parse('2026-08-12T08:00:00')),
    ];
    expect(currentStreak(sessions, now)).toBe(2);
  });
});

describe('recoveryGuidance', () => {
  it('returns null when there is no recorded history', () => {
    expect(recoveryGuidance([], Date.now())).toBeNull();
  });
});

function session(id: string, endedAt: number): WorkoutSession {
  return {
    id: asId(id),
    workoutId: asId('w1'),
    workoutNameSnapshot: 'Morning HIIT',
    status: 'COMPLETED',
    startedAt: endedAt - 60_000,
    endedAt,
    countdownSecondsUsed: 3,
    plannedRounds: 1,
    plannedExerciseCount: 1,
  };
}

function perf(sessionId: string, duration: number, completion: number): PerformanceRecord {
  return {
    id: asId(`p-${sessionId}`),
    sessionId: asId(sessionId),
    workoutId: asId('w1'),
    createdAt: 0,
    totalDurationSeconds: duration,
    totalActiveSeconds: duration,
    totalRestSeconds: 0,
    exerciseCount: 1,
    completedRounds: 1,
    completedIntervals: 1,
    plannedWorkSeconds: duration,
    plannedRestSeconds: 0,
    workCompletionPercent: completion,
  };
}
