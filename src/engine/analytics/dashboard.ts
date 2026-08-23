import { densityLabel, type WorkDensityLabel } from '../../config/density';
import { localDateKey } from '../../domain/date';
import { isValue } from '../../domain/metrics';
import type { IntervalSession, PerformanceRecord, WorkoutSession } from '../../domain/types';
import type { ChartPoint } from '../../ui/charts/LineChart';
import { calculateSessionMetrics } from '../calc/metrics';
import { performanceScore, type ScoreComponent } from '../score/performanceScore';

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
  partialWorkouts: number;
  sessionsRecorded: number;
  totalTrainingSeconds: number;
  totalActiveSeconds: number;
  totalRestSeconds: number;
  totalReps: number | null;
  totalRounds: number;
  averageDurationSeconds: number | null;
  averageCompletion: number | null;
  averageRepCompletion: number | null;
  averageIntervalCompletion: number | null;
  averageScore: number | null;
  averageWorkRestRatio: number | null;
  averageRoundCompletion: number | null;
  averageDistanceCompletion: number | null;
  totalExercises: number;
  totalCompletedIntervals: number;
  totalPlannedWorkSeconds: number;
  densityLabel: WorkDensityLabel | null;
  scoreComponents: ScoreComponent[] | null;
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
  const completions = meanOf(performance.map((row) => row.workCompletionPercent));
  const repCompletions = meanOf(performance.map((row) => row.repCompletionPercent));
  const intervalCompletions = meanOf(performance.map((row) => row.intervalCompletionRate));
  const scores = meanOf(performance.map((row) => row.performanceScore));
  const ratios = meanOf(performance.map((row) => row.workRestRatio));
  const reps = performance
    .map((row) => row.totalReps)
    .filter((value): value is number => value != null);
  const totalRestSeconds = performance
    .filter((row) => completed.some((session) => session.id === row.sessionId))
    .reduce((sum, row) => sum + row.totalRestSeconds, 0);
  const matchedPerf = performance.filter((row) => completed.some((session) => session.id === row.sessionId));
  const totalRounds = matchedPerf.reduce((sum, row) => sum + row.completedRounds, 0);
  const totalExercises = matchedPerf.reduce((sum, row) => sum + row.exerciseCount, 0);
  const totalCompletedIntervals = matchedPerf.reduce((sum, row) => sum + row.completedIntervals, 0);
  const totalPlannedWorkSeconds = matchedPerf.reduce((sum, row) => sum + row.plannedWorkSeconds, 0);
  const roundCompletions = meanOf(
    completed.map((session) => {
      const record = performanceBySession.get(session.id);
      if (record?.roundCompletionPercent != null) return record.roundCompletionPercent;
      if (!record || session.plannedRounds <= 0) return undefined;
      return (record.completedRounds / session.plannedRounds) * 100;
    }),
  );
  const distanceCompletions = meanOf(matchedPerf.map((row) => row.distanceCompletionPercent));
  const scoreComponents = averageScoreComponents(completed, performanceBySession);
  const density = densityLabel(
    totalRestSeconds > 0 ? totalActiveSeconds / totalRestSeconds : totalActiveSeconds > 0 ? Number.POSITIVE_INFINITY : null,
    totalRestSeconds,
    totalActiveSeconds,
  );
  return {
    workoutsCompleted: completed.filter((session) => session.status === 'COMPLETED').length,
    partialWorkouts: completed.filter((session) => session.status === 'PARTIAL').length,
    sessionsRecorded: completed.length,
    totalTrainingSeconds,
    totalActiveSeconds,
    totalRestSeconds,
    totalReps: reps.length ? reps.reduce((sum, value) => sum + value, 0) : null,
    totalRounds,
    averageDurationSeconds: completed.length ? totalTrainingSeconds / completed.length : null,
    averageCompletion: completions,
    averageRepCompletion: repCompletions,
    averageIntervalCompletion: intervalCompletions,
    averageScore: scores,
    averageWorkRestRatio: ratios,
    averageRoundCompletion: roundCompletions,
    averageDistanceCompletion: distanceCompletions,
    totalExercises,
    totalCompletedIntervals,
    totalPlannedWorkSeconds,
    densityLabel: density,
    scoreComponents,
    streak: currentStreak(completed, now),
  };
}

function averageScoreComponents(
  sessions: WorkoutSession[],
  performanceBySession: Map<string, PerformanceRecord>,
): ScoreComponent[] | null {
  const buckets = new Map<string, { label: string; score: number; weight: number; count: number }>();
  for (const session of sessions) {
    const record = performanceBySession.get(session.id);
    if (!record) continue;
    const metric = performanceScore({
      plannedWorkSeconds: record.plannedWorkSeconds,
      actualWorkSeconds: record.totalActiveSeconds,
      plannedWorkIntervals: record.plannedIntervals ?? 0,
      completedWorkIntervals: record.completedIntervals,
      plannedReps: record.plannedReps,
      actualReps: record.totalReps,
      plannedRounds: record.plannedRounds ?? session.plannedRounds,
      completedRounds: record.completedRounds,
    });
    if (!isValue(metric)) continue;
    for (const component of metric.value.components) {
      const current = buckets.get(component.key) ?? {
        label: component.label,
        score: 0,
        weight: 0,
        count: 0,
      };
      current.score += component.score;
      current.weight += component.renormalizedWeight;
      current.count += 1;
      buckets.set(component.key, current);
    }
  }
  if (buckets.size === 0) return null;
  return [...buckets.entries()].map(([key, row]) => ({
    key: key as ScoreComponent['key'],
    label: row.label,
    score: row.score / row.count,
    weight: row.weight / row.count,
    renormalizedWeight: row.weight / row.count,
  }));
}

function meanOf(values: Array<number | undefined>): number | null {
  const present = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (present.length === 0) return null;
  return present.reduce((sum, value) => sum + value, 0) / present.length;
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
  field: 'duration' | 'completion' | 'active' | 'rest' | 'reps' | 'score' | 'distance',
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
      if (field === 'rest') return { label, value: record.totalRestSeconds };
      if (field === 'score') {
        if (record.performanceScore == null) return null;
        return { label, value: record.performanceScore };
      }
      if (field === 'distance') {
        if (record.distanceCompletionPercent == null) return null;
        return { label, value: record.distanceCompletionPercent };
      }
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
