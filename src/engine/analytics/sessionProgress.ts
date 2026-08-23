import { NOT_ENOUGH_DATA, isValue, type Metric } from '../../domain/metrics';
import type { IntervalSession, WorkoutSession } from '../../domain/types';
import { Units } from '../../domain/units';
import { completionPercent } from '../calc/completion';
import { calculateSessionMetrics, type SessionMetrics } from '../calc/metrics';
import { workRestRatio } from '../calc/ratio';
import { scoreFromMetrics, type PerformanceScoreResult, type ScoreComponent } from '../score/performanceScore';

export interface ProgressTrackModel {
  key: string;
  label: string;
  detail: string;
  caption?: string;
  value: number | null;
}

export interface WorkRestModel {
  display: string;
  label: string | null;
  workSeconds: number;
  restSeconds: number;
}

export interface IntervalProgressModel {
  id: string;
  title: string;
  outcome: string;
  tracks: ProgressTrackModel[];
}

export interface SessionProgressTotals {
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
  score: number | null;
  workRestRatio: number | null;
  exerciseCount: number;
  trainingSeconds: number;
  workCompletion: number | null;
  intervalCompletion: number | null;
  roundCompletion: number | null;
  repCompletion: number | null;
  distanceCompletion: number | null;
  scoreComponents: ScoreComponent[] | null;
}

export interface SessionProgressSnapshot {
  tracks: ProgressTrackModel[];
  scoreParts: ProgressTrackModel[];
  workRest: WorkRestModel;
  intervals: IntervalProgressModel[];
  totals: SessionProgressTotals;
}

export interface AggregatedProgress {
  tracks: ProgressTrackModel[];
  scoreParts: ProgressTrackModel[];
  workRest: WorkRestModel;
  totals: SessionProgressTotals;
  sessionCount: number;
}

export function buildSessionProgress(
  session: Pick<WorkoutSession, 'plannedRounds' | 'plannedExerciseCount' | 'startedAt' | 'endedAt'>,
  intervals: IntervalSession[],
  now: number = Date.now(),
): SessionProgressSnapshot {
  const metrics = calculateSessionMetrics(session, intervals, now);
  const score = scoreFromMetrics(metrics, session.plannedRounds);
  return sessionProgressFromMetrics(metrics, session.plannedRounds, score, intervals);
}

export function sessionProgressFromMetrics(
  metrics: SessionMetrics,
  plannedRounds: number,
  score: Metric<PerformanceScoreResult>,
  intervals: IntervalSession[],
): SessionProgressSnapshot {
  const totals = totalsFromMetrics(metrics, plannedRounds, score);
  const workCaption = pairCaption(
    totals.actualWorkSeconds,
    totals.plannedWorkSeconds,
    formatSeconds,
    totals.plannedWorkSeconds > 0,
  );
  const intervalCaption = pairCaption(
    totals.completedIntervals,
    totals.plannedIntervals,
    formatCount,
    totals.plannedIntervals != null,
  );
  const roundCaption = pairCaption(
    totals.completedRounds,
    totals.plannedRounds,
    formatCount,
    totals.plannedRounds > 0,
  );
  const repCaption = pairCaption(
    totals.actualReps,
    totals.plannedReps,
    formatCount,
    totals.plannedReps != null,
  );
  const distanceCaption = pairCaption(
    totals.actualDistanceMeters,
    totals.plannedDistanceMeters,
    formatMeters,
    totals.plannedDistanceMeters != null,
  );

  return {
    tracks: [
      percentTrack('work', 'Work', metrics.workCompletionPercent, workCaption),
      percentTrack('intervals', 'Intervals', metrics.intervalCompletionRate, intervalCaption),
      percentTrack(
        'rounds',
        'Rounds',
        completionPercent(plannedRounds > 0 ? plannedRounds : undefined, totals.completedRounds),
        roundCaption,
      ),
      percentTrack('reps', 'Reps', metrics.repCompletionPercent, repCaption),
      percentTrack('distance', 'Distance', metrics.distanceCompletionPercent, distanceCaption),
      scoreTrack(score),
    ],
    scoreParts: scorePartsFrom(isValue(score) ? score.value.components : null),
    workRest: workRestFromTotals(totals),
    intervals: intervalProgressModels(intervals),
    totals,
  };
}

export function aggregateSessionProgress(snapshots: SessionProgressSnapshot[]): AggregatedProgress {
  const sessionCount = snapshots.length;
  const totals = emptyTotals();
  if (sessionCount === 0) {
    return {
      tracks: emptyAggregateTracks(totals),
      scoreParts: [],
      workRest: workRestFromTotals(totals),
      totals,
      sessionCount: 0,
    };
  }

  totals.plannedWorkSeconds = sum(snapshots.map((row) => row.totals.plannedWorkSeconds));
  totals.actualWorkSeconds = sum(snapshots.map((row) => row.totals.actualWorkSeconds));
  totals.restSeconds = sum(snapshots.map((row) => row.totals.restSeconds));
  totals.completedIntervals = sum(snapshots.map((row) => row.totals.completedIntervals));
  totals.completedRounds = sum(snapshots.map((row) => row.totals.completedRounds));
  totals.exerciseCount = sum(snapshots.map((row) => row.totals.exerciseCount));
  totals.trainingSeconds = sum(snapshots.map((row) => row.totals.trainingSeconds));
  totals.plannedRounds = sum(snapshots.map((row) => row.totals.plannedRounds));
  totals.plannedIntervals = sumNullable(snapshots.map((row) => row.totals.plannedIntervals));
  totals.plannedReps = sumNullable(snapshots.map((row) => row.totals.plannedReps));
  totals.actualReps = sumNullable(snapshots.map((row) => row.totals.actualReps));
  totals.plannedDistanceMeters = sumNullable(snapshots.map((row) => row.totals.plannedDistanceMeters));
  totals.actualDistanceMeters = sumNullable(snapshots.map((row) => row.totals.actualDistanceMeters));
  totals.workCompletion = meanOf(snapshots.map((row) => row.totals.workCompletion));
  totals.intervalCompletion = meanOf(snapshots.map((row) => row.totals.intervalCompletion));
  totals.roundCompletion = meanOf(snapshots.map((row) => row.totals.roundCompletion));
  totals.repCompletion = meanOf(snapshots.map((row) => row.totals.repCompletion));
  totals.distanceCompletion = meanOf(snapshots.map((row) => row.totals.distanceCompletion));
  totals.score = meanOf(snapshots.map((row) => row.totals.score));
  const ratio = workRestRatio(totals.actualWorkSeconds, totals.restSeconds);
  totals.workRestRatio = isValue(ratio) && Number.isFinite(ratio.value.ratio) ? ratio.value.ratio : null;
  totals.scoreComponents = averageScoreComponents(snapshots);

  const plannedWorkRatio =
    totals.plannedWorkSeconds > 0 ? totals.actualWorkSeconds / totals.plannedWorkSeconds : null;

  return {
    tracks: [
      meanTrack('work', 'Work', totals.workCompletion),
      {
        key: 'plannedWork',
        label: 'Planned work done',
        detail:
          plannedWorkRatio == null
            ? NOT_ENOUGH_DATA
            : `${formatSeconds(totals.actualWorkSeconds)} / ${formatSeconds(totals.plannedWorkSeconds)}`,
        caption: plannedWorkRatio == null ? undefined : Units.formatPercent(plannedWorkRatio * 100),
        value: plannedWorkRatio,
      },
      meanTrack(
        'intervals',
        'Intervals',
        totals.intervalCompletion,
        pairCaption(totals.completedIntervals, totals.plannedIntervals, formatCount, totals.plannedIntervals != null),
      ),
      meanTrack(
        'rounds',
        'Rounds',
        totals.roundCompletion,
        pairCaption(totals.completedRounds, totals.plannedRounds, formatCount, totals.plannedRounds > 0),
      ),
      meanTrack(
        'reps',
        'Reps',
        totals.repCompletion,
        pairCaption(totals.actualReps, totals.plannedReps, formatCount, totals.plannedReps != null),
      ),
      meanTrack(
        'distance',
        'Distance',
        totals.distanceCompletion,
        pairCaption(
          totals.actualDistanceMeters,
          totals.plannedDistanceMeters,
          formatMeters,
          totals.plannedDistanceMeters != null,
        ),
      ),
      {
        key: 'performance',
        label: 'Performance',
        detail: totals.score == null ? NOT_ENOUGH_DATA : String(Math.round(totals.score)),
        value: totals.score == null ? null : totals.score / 100,
      },
    ],
    scoreParts: scorePartsFrom(totals.scoreComponents),
    workRest: workRestFromTotals(totals),
    totals,
    sessionCount,
  };
}

function totalsFromMetrics(
  metrics: SessionMetrics,
  plannedRounds: number,
  score: Metric<PerformanceScoreResult>,
): SessionProgressTotals {
  const completedRounds = numeric(metrics.completedRounds) ?? 0;
  const roundCompletion = isValue(completionPercent(plannedRounds > 0 ? plannedRounds : undefined, completedRounds))
    ? (completedRounds / plannedRounds) * 100
    : null;
  const workRest = isValue(metrics.workRest) && Number.isFinite(metrics.workRest.value.ratio)
    ? metrics.workRest.value.ratio
    : null;
  return {
    plannedWorkSeconds: numeric(metrics.plannedWorkSeconds) ?? 0,
    actualWorkSeconds: numeric(metrics.actualWorkSeconds) ?? 0,
    restSeconds: numeric(metrics.totalRestSeconds) ?? 0,
    plannedIntervals: numeric(metrics.plannedIntervals),
    completedIntervals: numeric(metrics.completedIntervals) ?? 0,
    plannedRounds,
    completedRounds,
    plannedReps: numeric(metrics.plannedReps),
    actualReps: numeric(metrics.actualReps),
    plannedDistanceMeters: numeric(metrics.plannedDistanceMeters),
    actualDistanceMeters: numeric(metrics.actualDistanceMeters),
    score: isValue(score) ? score.value.total : null,
    workRestRatio: workRest,
    exerciseCount: numeric(metrics.exerciseCount) ?? 0,
    trainingSeconds: numeric(metrics.totalDurationSeconds) ?? 0,
    workCompletion: numeric(metrics.workCompletionPercent),
    intervalCompletion: numeric(metrics.intervalCompletionRate),
    roundCompletion,
    repCompletion: numeric(metrics.repCompletionPercent),
    distanceCompletion: numeric(metrics.distanceCompletionPercent),
    scoreComponents: isValue(score) ? score.value.components : null,
  };
}

function intervalProgressModels(intervals: IntervalSession[]): IntervalProgressModel[] {
  return intervals
    .filter((row) => row.phase === 'WORK')
    .map((row) => {
      const tracks: ProgressTrackModel[] = [
        ratioTrack('time', 'Time', row.plannedSeconds, row.actualSeconds, (value) => `${trimNumber(value)}s`),
      ];
      if (row.plannedReps != null || (row.actualReps != null && row.actualReps > 0)) {
        tracks.push(ratioTrack('reps', 'Reps', row.plannedReps, row.actualReps, (value) => formatCount(value)));
      }
      if (row.plannedDistance != null || (row.actualDistance != null && row.actualDistance > 0)) {
        const unit = row.distanceUnit ?? 'm';
        tracks.push(
          ratioTrack('distance', 'Distance', row.plannedDistance, row.actualDistance, (value) => `${trimNumber(value)}${unit}`),
        );
      }
      return {
        id: row.id,
        title: `R${row.roundIndex} · ${row.exerciseNameSnapshot}`,
        outcome: row.outcome,
        tracks,
      };
    });
}

function ratioTrack(
  key: string,
  label: string,
  planned: number | undefined | null,
  actual: number | undefined | null,
  format: (value: number) => string,
): ProgressTrackModel {
  if (actual == null || !Number.isFinite(actual) || actual < 0) {
    return emptyTrack(key, label);
  }
  if (planned == null || !Number.isFinite(planned) || planned <= 0) {
    return {
      key,
      label,
      detail: format(actual),
      caption: 'Recorded (no target)',
      value: 1,
    };
  }
  return {
    key,
    label,
    detail: Units.formatPercent((actual / planned) * 100),
    caption: `${format(actual)} / ${format(planned)}`,
    value: actual / planned,
  };
}

function percentTrack(
  key: string,
  label: string,
  metric: Metric<number>,
  caption?: string,
): ProgressTrackModel {
  if (!isValue(metric)) return { ...emptyTrack(key, label), caption };
  return {
    key,
    label,
    detail: Units.formatPercent(metric.value),
    caption,
    value: metric.value / 100,
  };
}

function scoreTrack(score: Metric<PerformanceScoreResult>): ProgressTrackModel {
  if (!isValue(score)) return emptyTrack('performance', 'Performance');
  return {
    key: 'performance',
    label: 'Performance',
    detail: String(Math.round(score.value.total)),
    value: score.value.total / 100,
  };
}

function scorePartsFrom(components: ScoreComponent[] | null): ProgressTrackModel[] {
  if (!components || components.length === 0) return [];
  return components.map((part) => ({
    key: part.key,
    label: part.label,
    detail: `${Math.round(part.score)} · ${Units.formatPercent(part.renormalizedWeight * 100)} of score`,
    value: part.score / 100,
  }));
}

function meanTrack(key: string, label: string, percent: number | null, caption?: string): ProgressTrackModel {
  if (percent == null) return { ...emptyTrack(key, label), caption };
  return {
    key,
    label,
    detail: Units.formatPercent(percent),
    caption,
    value: percent / 100,
  };
}

function emptyAggregateTracks(totals: SessionProgressTotals): ProgressTrackModel[] {
  return [
    emptyTrack('work', 'Work'),
    emptyTrack('plannedWork', 'Planned work done'),
    emptyTrack('intervals', 'Intervals'),
    emptyTrack('rounds', 'Rounds'),
    emptyTrack('reps', 'Reps'),
    emptyTrack('distance', 'Distance'),
    emptyTrack('performance', 'Performance'),
  ].map((track) =>
    track.key === 'plannedWork' && totals.plannedWorkSeconds <= 0
      ? track
      : track,
  );
}

function workRestFromTotals(totals: SessionProgressTotals): WorkRestModel {
  const metric = workRestRatio(totals.actualWorkSeconds, totals.restSeconds);
  if (!isValue(metric)) {
    return {
      display: NOT_ENOUGH_DATA,
      label: null,
      workSeconds: totals.actualWorkSeconds,
      restSeconds: totals.restSeconds,
    };
  }
  return {
    display: metric.value.display,
    label: metric.value.label,
    workSeconds: totals.actualWorkSeconds,
    restSeconds: totals.restSeconds,
  };
}

function averageScoreComponents(snapshots: SessionProgressSnapshot[]): ScoreComponent[] | null {
  const buckets = new Map<string, { label: string; score: number; weight: number; count: number }>();
  for (const snapshot of snapshots) {
    for (const part of snapshot.totals.scoreComponents ?? []) {
      const current = buckets.get(part.key) ?? { label: part.label, score: 0, weight: 0, count: 0 };
      current.score += part.score;
      current.weight += part.renormalizedWeight;
      current.count += 1;
      buckets.set(part.key, current);
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

function pairCaption(
  actual: number | null,
  planned: number | null,
  format: (value: number) => string,
  hasPlan: boolean,
): string | undefined {
  if (!hasPlan || planned == null || actual == null) return undefined;
  return `${format(actual)} / ${format(planned)}`;
}

function emptyTrack(key: string, label: string): ProgressTrackModel {
  return { key, label, detail: NOT_ENOUGH_DATA, value: null };
}

function emptyTotals(): SessionProgressTotals {
  return {
    plannedWorkSeconds: 0,
    actualWorkSeconds: 0,
    restSeconds: 0,
    plannedIntervals: null,
    completedIntervals: 0,
    plannedRounds: 0,
    completedRounds: 0,
    plannedReps: null,
    actualReps: null,
    plannedDistanceMeters: null,
    actualDistanceMeters: null,
    score: null,
    workRestRatio: null,
    exerciseCount: 0,
    trainingSeconds: 0,
    workCompletion: null,
    intervalCompletion: null,
    roundCompletion: null,
    repCompletion: null,
    distanceCompletion: null,
    scoreComponents: null,
  };
}

function numeric(metric: Metric<number>): number | null {
  return isValue(metric) ? metric.value : null;
}

function meanOf(values: Array<number | null>): number | null {
  const present = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (present.length === 0) return null;
  return present.reduce((sum, value) => sum + value, 0) / present.length;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function sumNullable(values: Array<number | null>): number | null {
  const present = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (present.length === 0) return null;
  return present.reduce((total, value) => total + value, 0);
}

function formatSeconds(value: number): string {
  return Units.formatCompactDuration(value);
}

function formatCount(value: number): string {
  return Number.isInteger(value) ? String(value) : trimNumber(value);
}

function formatMeters(value: number): string {
  return Units.formatDistance(value, 'm');
}

function trimNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
