import type { IntervalSession, WorkoutSession } from '../../domain/types';
import { insufficient, isValue, type Metric, value } from '../../domain/metrics';
import { completionPercent } from './completion';
import { workRestRatio, type WorkRestAnalysis } from './ratio';

export interface SessionMetrics {
  totalDurationSeconds: Metric<number>;
  totalActiveSeconds: Metric<number>;
  totalRestSeconds: Metric<number>;
  exerciseCount: Metric<number>;
  completedRounds: Metric<number>;
  completedIntervals: Metric<number>;
  plannedIntervals: Metric<number>;
  totalReps: Metric<number>;
  averageRepsPerInterval: Metric<number>;
  averageWorkIntervalDuration: Metric<number>;
  averageRestDuration: Metric<number>;
  workRest: Metric<WorkRestAnalysis>;
  workCompletionPercent: Metric<number>;
  repCompletionPercent: Metric<number>;
  intervalCompletionRate: Metric<number>;
  plannedWorkSeconds: Metric<number>;
  actualWorkSeconds: Metric<number>;
  plannedReps: Metric<number>;
  actualReps: Metric<number>;
  bestInterval: Metric<IntervalSession>;
  weakestInterval: Metric<IntervalSession>;
}

export function calculateSessionMetrics(
  session: Pick<WorkoutSession, 'startedAt' | 'endedAt' | 'plannedRounds' | 'plannedExerciseCount'>,
  intervals: IntervalSession[],
  now: number = Date.now(),
): SessionMetrics {
  const work = intervals.filter((row) => row.phase === 'WORK');
  const rest = intervals.filter((row) => row.phase === 'REST' || row.phase === 'TRANSITION');

  const endedAt = session.endedAt ?? now;
  const totalDurationSeconds = Math.max(0, (endedAt - session.startedAt) / 1000);

  const totalActiveSeconds = sum(work.map((row) => row.actualSeconds));
  const totalRestSeconds = sum(rest.map((row) => row.actualSeconds));
  const plannedWorkSeconds = sum(work.map((row) => row.plannedSeconds));
  const plannedRepsList = work.map((row) => row.plannedReps).filter((n): n is number => n != null);
  const actualRepsList = work.map((row) => row.actualReps).filter((n): n is number => n != null);

  const completedWork = work.filter((row) => row.outcome === 'COMPLETED');
  const exerciseIds = new Set(
    work.filter((row) => row.outcome !== 'SKIPPED' && row.outcome !== 'CANCELLED').map((row) => row.exerciseId),
  );

  const completedRounds = countCompletedRounds(work, session.plannedExerciseCount, session.plannedRounds);

  const comparable = work.filter(
    (row) => row.plannedSeconds > 0 && row.actualSeconds >= 0 && row.outcome !== 'CANCELLED',
  );
  const ranked = [...comparable].sort((a, b) => {
    const aPct = a.actualSeconds / a.plannedSeconds;
    const bPct = b.actualSeconds / b.plannedSeconds;
    return bPct - aPct;
  });

  const totalReps = actualRepsList.length > 0 ? sum(actualRepsList) : null;
  const plannedReps = plannedRepsList.length > 0 ? sum(plannedRepsList) : null;

  return {
    totalDurationSeconds: value(totalDurationSeconds),
    totalActiveSeconds: value(totalActiveSeconds),
    totalRestSeconds: value(totalRestSeconds),
    exerciseCount: value(exerciseIds.size),
    completedRounds: value(completedRounds),
    completedIntervals: value(completedWork.length),
    plannedIntervals: work.length > 0 ? value(work.length) : insufficient('no intervals'),
    totalReps: totalReps == null ? insufficient('no reps recorded') : value(totalReps),
    averageRepsPerInterval:
      actualRepsList.length === 0
        ? insufficient('no reps recorded')
        : value(sum(actualRepsList) / actualRepsList.length),
    averageWorkIntervalDuration:
      work.length === 0 ? insufficient('no work intervals') : value(totalActiveSeconds / work.length),
    averageRestDuration: rest.length === 0 ? insufficient('no rest intervals') : value(totalRestSeconds / rest.length),
    workRest: workRestRatio(totalActiveSeconds, totalRestSeconds),
    workCompletionPercent: completionPercent(plannedWorkSeconds, totalActiveSeconds),
    repCompletionPercent: completionPercent(plannedReps ?? undefined, totalReps ?? undefined),
    intervalCompletionRate: completionPercent(work.length, completedWork.length),
    plannedWorkSeconds: plannedWorkSeconds > 0 || work.length > 0 ? value(plannedWorkSeconds) : insufficient('no planned work'),
    actualWorkSeconds: value(totalActiveSeconds),
    plannedReps: plannedReps == null ? insufficient('no planned reps') : value(plannedReps),
    actualReps: totalReps == null ? insufficient('no reps recorded') : value(totalReps),
    bestInterval: ranked.length >= 2 ? value(ranked[0]) : insufficient('need at least two comparable intervals'),
    weakestInterval: ranked.length >= 2 ? value(ranked[ranked.length - 1]) : insufficient('need at least two comparable intervals'),
  };
}

function countCompletedRounds(
  work: IntervalSession[],
  plannedExerciseCount: number,
  plannedRounds: number,
): number {
  if (plannedExerciseCount <= 0) return 0;
  let completed = 0;
  for (let round = 1; round <= plannedRounds; round += 1) {
    const rows = work.filter((row) => row.roundIndex === round);
    if (rows.length < plannedExerciseCount) continue;
    if (rows.every((row) => row.outcome === 'COMPLETED')) completed += 1;
  }
  return completed;
}

function sum(values: number[]): number {
  return values.reduce((total, n) => total + n, 0);
}

export function metricNumber(metric: Metric<number>): number | undefined {
  return isValue(metric) ? metric.value : undefined;
}
