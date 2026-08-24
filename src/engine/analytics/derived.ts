import { localDateKey } from '../../domain/date';
import { isValue, type Metric } from '../../domain/metrics';
import type { IntervalSession, PerformanceRecord, WorkoutSession } from '../../domain/types';
import { Units } from '../../domain/units';
import { completionPercent } from '../calc/completion';
import { calculateSessionMetrics, type SessionMetrics } from '../calc/metrics';
import { workRestRatio } from '../calc/ratio';
import { scoreFromMetrics, type PerformanceScoreResult, type ScoreComponent } from '../score/performanceScore';

export interface SessionDerived {
  workCompletion: Metric<number>;
  intervalCompletion: Metric<number>;
  roundCompletion: Metric<number>;
  repCompletion: Metric<number>;
  distanceCompletion: Metric<number>;
  workRestRatio: Metric<number>;
  performanceScore: Metric<number>;
  plannedWorkSeconds: number;
  actualWorkSeconds: number;
  restSeconds: number;
  plannedIntervals: number | null;
  completedIntervals: number;
  plannedRounds: number;
  completedRounds: number;
  plannedReps: number | null;
  actualReps: number | null;
  plannedDistanceMeters: number | null;
  actualDistanceMeters: number | null;
  totalReps: number | null;
  totalDurationSeconds: number;
  totalActiveSeconds: number;
  totalRestSeconds: number;
  exerciseCount: number;
  completedRounds: number;
  completedIntervals: number;
  scoreComponents: ScoreComponent[] | null;
  bestInterval: Metric<IntervalSession>;
  weakestInterval: Metric<IntervalSession>;
}

export function deriveSession(session: Pick<WorkoutSession, 'plannedRounds' | 'plannedExerciseCount' | 'startedAt' | 'endedAt'>, intervals: IntervalSession[]): SessionDerived {
  const metrics = calculateSessionMetrics(session, intervals, session.endedAt ?? Date.now());
  const score = scoreFromMetrics(metrics, session.plannedRounds);
  const completedRoundsVal = isValue(metrics.completedRounds) ? metrics.completedRounds.value : 0;
  const roundCompletionVal = isValue(completionPercent(session.plannedRounds > 0 ? session.plannedRounds : undefined, completedRoundsVal))
    ? (completedRoundsVal / session.plannedRounds) * 100
    : null;
  const workRestVal = isValue(metrics.workRest) && Number.isFinite(metrics.workRest.value.ratio)
    ? metrics.workRest.value.ratio
    : null;
  const completedIntervalsVal = isValue(metrics.completedIntervals) ? metrics.completedIntervals.value : 0;
  const exerciseCountVal = isValue(metrics.exerciseCount) ? metrics.exerciseCount.value : 0;

  const comparable = intervals
    .filter((row) => row.phase === 'WORK' && row.plannedSeconds > 0 && row.actualSeconds >= 0 && row.outcome !== 'CANCELLED')
    .sort((a, b) => (b.actualSeconds / b.plannedSeconds) - (a.actualSeconds / a.plannedSeconds));

  const bestInterval = comparable.length >= 2 ? { kind: 'value' as const, value: comparable[0] } : { kind: 'insufficient' as const, reason: 'need at least two comparable intervals' };
  const weakestInterval = comparable.length >= 2 ? { kind: 'value' as const, value: comparable[comparable.length - 1] } : { kind: 'insufficient' as const, reason: 'need at least two comparable intervals' };

  return {
    workCompletion: metrics.workCompletionPercent,
    intervalCompletion: metrics.intervalCompletionRate,
    roundCompletion: session.plannedRounds > 0 && completedRoundsVal > 0 ? { kind: 'value' as const, value: (completedRoundsVal / session.plannedRounds) * 100 } : { kind: 'insufficient' as const, reason: 'no planned rounds' },
    repCompletion: metrics.repCompletionPercent,
    distanceCompletion: metrics.distanceCompletionPercent,
    workRestRatio: workRestVal != null ? { kind: 'value' as const, value: workRestVal } : { kind: 'insufficient' as const, reason: 'no work or rest' },
    performanceScore: isValue(score) ? { kind: 'value' as const, value: score.value.total } : { kind: 'insufficient' as const, reason: 'no score' },
    plannedWorkSeconds: isValue(metrics.plannedWorkSeconds) ? metrics.plannedWorkSeconds.value : 0,
    actualWorkSeconds: isValue(metrics.actualWorkSeconds) ? metrics.actualWorkSeconds.value : 0,
    restSeconds: isValue(metrics.totalRestSeconds) ? metrics.totalRestSeconds.value : 0,
    plannedIntervals: isValue(metrics.plannedIntervals) ? metrics.plannedIntervals.value : null,
    completedIntervals: completedIntervalsVal,
    plannedRounds: session.plannedRounds,
    completedRounds: completedRoundsVal,
    plannedReps: isValue(metrics.plannedReps) ? metrics.plannedReps.value : null,
    actualReps: isValue(metrics.actualReps) ? metrics.actualReps.value : null,
    plannedDistanceMeters: isValue(metrics.plannedDistanceMeters) ? metrics.plannedDistanceMeters.value : null,
    actualDistanceMeters: isValue(metrics.actualDistanceMeters) ? metrics.actualDistanceMeters.value : null,
    totalReps: isValue(metrics.totalReps) ? metrics.totalReps.value : null,
    totalDurationSeconds: isValue(metrics.totalDurationSeconds) ? metrics.totalDurationSeconds.value : 0,
    totalActiveSeconds: isValue(metrics.totalActiveSeconds) ? metrics.totalActiveSeconds.value : 0,
    totalRestSeconds: isValue(metrics.totalRestSeconds) ? metrics.totalRestSeconds.value : 0,
    exerciseCount: exerciseCountVal,
    completedRounds: completedRoundsVal,
    completedIntervals: completedIntervalsVal,
    scoreComponents: isValue(score) ? score.value.components : null,
    bestInterval,
    weakestInterval,
  };
}

export function getSessionCompletion(session: WorkoutSession, intervals: IntervalSession[]): Metric<number> {
  const derived = deriveSession(session, intervals);
  return derived.workCompletion;
}

export function getWeeklyAggregate(sessions: WorkoutSession[], intervals: IntervalSession[], now: number) {
  return { 
    workCompletion: { kind: 'insufficient' as const, reason: 'not implemented' },
    intervalCompletion: { kind: 'insufficient' as const, reason: 'not implemented' },
    roundCompletion: { kind: 'insufficient' as const, reason: 'not implemented' },
    repCompletion: { kind: 'insufficient' as const, reason: 'not implemented' },
    distanceCompletion: { kind: 'insufficient' as const, reason: 'not implemented' },
    workRestRatio: { kind: 'insufficient' as const, reason: 'not implemented' },
    performanceScore: { kind: 'insufficient' as const, reason: 'not implemented' },
    totalTrainingSeconds: 0,
    totalActiveSeconds: 0,
    totalRestSeconds: 0,
    totalReps: null,
    totalRounds: 0,
    totalCompletedIntervals: 0,
    totalExercises: 0,
    totalPlannedWorkSeconds: 0,
    totalCompletedIntervals: 0,
    streak: 0,
  };
}

export function getProgressRange(sessions: WorkoutSession[], intervals: IntervalSession[], now: number) {
  return { 
    workCompletion: { kind: 'insufficient' as const, reason: 'not implemented' },
    intervalCompletion: { kind: 'insufficient' as const, reason: 'not implemented' },
    roundCompletion: { kind: 'insufficient' as const, reason: 'not implemented' },
    repCompletion: { kind: 'insufficient' as const, reason: 'not implemented' },
    distanceCompletion: { kind: 'insufficient' as const, reason: 'not implemented' },
    workRestRatio: { kind: 'insufficient' as const, reason: 'not implemented' },
    performanceScore: { kind: 'insufficient' as const, reason: 'not implemented' },
    totalTrainingSeconds: 0,
    totalActiveSeconds: 0,
    totalRestSeconds: 0,
    totalReps: null,
    totalRounds: 0,
    totalCompletedIntervals: 0,
    totalExercises: 0,
    totalPlannedWorkSeconds: 0,
    totalCompletedIntervals: 0,
    streak: 0,
  };
}