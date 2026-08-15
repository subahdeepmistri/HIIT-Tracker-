import { localDateKey } from '../../domain/date';
import { isValue } from '../../domain/metrics';
import type { IntervalSession, PerformanceRecord, WorkoutSession } from '../../domain/types';
import type { ChartPoint } from '../../ui/charts/LineChart';
import { calculateSessionMetrics } from '../calc/metrics';

export type RangeKey = '7' | '30' | '90' | 'all';

export function rangeStart(range: RangeKey, now: number): number | null {
  if (range === 'all') return null;
  const days = Number(range);
  return now - days * 24 * 60 * 60 * 1000;
}

export function filterSessions(sessions: WorkoutSession[], range: RangeKey, now: number): WorkoutSession[] {
  const start = rangeStart(range, now);
  return sessions.filter((session) => {
    if (session.status !== 'COMPLETED' && session.status !== 'PARTIAL') return false;
    const at = session.endedAt ?? session.startedAt;
    return start == null || at >= start;
  });
}

export interface DashboardStats {
  workoutsCompleted: number;
  totalTrainingSeconds: number;
  totalActiveSeconds: number;
  averageDurationSeconds: number | null;
  averageCompletion: number | null;
  streak: number;
}

export function dashboardStats(
  sessions: WorkoutSession[],
  performance: PerformanceRecord[],
  now: number,
): DashboardStats {
  const completed = sessions.filter((session) => session.status === 'COMPLETED' || session.status === 'PARTIAL');
  const performanceBySession = new Map(performance.map((row) => [row.sessionId, row]));
  const totalTrainingSeconds = completed.reduce((sum, session) => {
    const record = performanceBySession.get(session.id);
    if (record) return sum + record.totalDurationSeconds;
    return sum;
  }, 0);
  const totalActiveSeconds = performance
    .filter((row) => completed.some((session) => session.id === row.sessionId))
    .reduce((sum, row) => sum + row.totalActiveSeconds, 0);
  const completions = performance
    .map((row) => row.workCompletionPercent)
    .filter((value): value is number => value != null);
  return {
    workoutsCompleted: completed.filter((session) => session.status === 'COMPLETED').length,
    totalTrainingSeconds,
    totalActiveSeconds,
    averageDurationSeconds: completed.length ? totalTrainingSeconds / completed.length : null,
    averageCompletion: completions.length ? completions.reduce((a, b) => a + b, 0) / completions.length : null,
    streak: currentStreak(completed, now),
  };
}

export function currentStreak(sessions: WorkoutSession[], now: number): number {
  const days = new Set(
    sessions
      .filter((session) => session.status === 'COMPLETED')
      .map((session) => localDateKey(session.endedAt ?? session.startedAt)),
  );
  if (days.size === 0) return 0;
  let streak = 0;
  const cursor = new Date(now);
  cursor.setHours(12, 0, 0, 0);
  const todayKey = localDateKey(cursor.getTime());
  if (!days.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (days.has(localDateKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function weekStats(sessions: WorkoutSession[], performance: PerformanceRecord[], now: number): DashboardStats {
  const week = filterSessions(sessions, '7', now);
  const weekPerf = performance.filter((row) => week.some((session) => session.id === row.sessionId));
  return dashboardStats(week, weekPerf, now);
}

export function trendPoints(
  sessions: WorkoutSession[],
  performance: PerformanceRecord[],
  range: RangeKey,
  now: number,
  field: 'duration' | 'completion' | 'active' | 'reps',
): ChartPoint[] {
  const selected = filterSessions(sessions, range, now);
  return selected
    .slice()
    .sort((a, b) => (a.endedAt ?? a.startedAt) - (b.endedAt ?? b.startedAt))
    .map((session) => {
      const record = performance.find((row) => row.sessionId === session.id);
      const at = session.endedAt ?? session.startedAt;
      const label = localDateKey(at).slice(5);
      if (!record) return null;
      if (field === 'duration') return { label, value: record.totalDurationSeconds };
      if (field === 'completion') {
        if (record.workCompletionPercent == null) return null;
        return { label, value: record.workCompletionPercent };
      }
      if (field === 'active') return { label, value: record.totalActiveSeconds };
      if (record.totalReps == null) return null;
      return { label, value: record.totalReps };
    })
    .filter((point): point is ChartPoint => point != null);
}

export function sessionMetricsSafe(session: WorkoutSession, intervals: IntervalSession[]) {
  return calculateSessionMetrics(session, intervals, session.endedAt ?? Date.now());
}

export function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export { isValue };
