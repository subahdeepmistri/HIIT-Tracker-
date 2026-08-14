import { SCORE_WEIGHTS, type ScoreWeightKey } from '../../config/scoreWeights';
import { insufficient, isValue, type Metric, value } from '../../domain/metrics';
import { completionPercent } from '../calc/completion';
import type { SessionMetrics } from '../calc/metrics';

export interface ScoreComponent {
  key: ScoreWeightKey;
  label: string;
  score: number;
  weight: number;
  renormalizedWeight: number;
}

export interface PerformanceScoreResult {
  total: number;
  components: ScoreComponent[];
}

const LABELS: Record<ScoreWeightKey, string> = {
  completionScore: 'Work completion',
  intervalScore: 'Interval completion',
  repScore: 'Rep completion',
  roundScore: 'Round completion',
};

export function performanceScore(
  input: {
    plannedWorkSeconds: number;
    actualWorkSeconds: number;
    plannedWorkIntervals: number;
    completedWorkIntervals: number;
    plannedReps?: number;
    actualReps?: number;
    plannedRounds: number;
    completedRounds: number;
  },
  weights: typeof SCORE_WEIGHTS = SCORE_WEIGHTS,
): Metric<PerformanceScoreResult> {
  const raw: Array<{ key: ScoreWeightKey; score: Metric<number>; weight: number }> = [
    {
      key: 'completionScore',
      score: completionPercent(input.plannedWorkSeconds, input.actualWorkSeconds),
      weight: weights.completionScore,
    },
    {
      key: 'intervalScore',
      score: completionPercent(input.plannedWorkIntervals, input.completedWorkIntervals),
      weight: weights.intervalScore,
    },
    {
      key: 'repScore',
      score: completionPercent(input.plannedReps, input.actualReps),
      weight: weights.repScore,
    },
    {
      key: 'roundScore',
      score: completionPercent(input.plannedRounds, input.completedRounds),
      weight: weights.roundScore,
    },
  ];

  const available = raw.filter((row) => isValue(row.score));
  if (available.length === 0) return insufficient('no scoreable dimensions');

  const weightSum = available.reduce((sum, row) => sum + row.weight, 0);
  if (weightSum <= 0) return insufficient('weights sum to zero');

  const components: ScoreComponent[] = available.map((row) => {
    const score = (row.score as { kind: 'value'; value: number }).value;
    return {
      key: row.key,
      label: LABELS[row.key],
      score,
      weight: row.weight,
      renormalizedWeight: row.weight / weightSum,
    };
  });

  const total = components.reduce((sum, row) => sum + row.score * row.renormalizedWeight, 0);
  return value({ total, components });
}

export function scoreFromMetrics(
  metrics: SessionMetrics,
  plannedRounds: number,
): Metric<PerformanceScoreResult> {
  return performanceScore({
    plannedWorkSeconds: isValue(metrics.plannedWorkSeconds) ? metrics.plannedWorkSeconds.value : 0,
    actualWorkSeconds: isValue(metrics.actualWorkSeconds) ? metrics.actualWorkSeconds.value : 0,
    plannedWorkIntervals: isValue(metrics.plannedIntervals) ? metrics.plannedIntervals.value : 0,
    completedWorkIntervals: isValue(metrics.completedIntervals) ? metrics.completedIntervals.value : 0,
    plannedReps: isValue(metrics.plannedReps) ? metrics.plannedReps.value : undefined,
    actualReps: isValue(metrics.actualReps) ? metrics.actualReps.value : undefined,
    plannedRounds,
    completedRounds: isValue(metrics.completedRounds) ? metrics.completedRounds.value : 0,
  });
}
