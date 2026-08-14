/**
 * Performance score weights.
 *
 * Formula (documented, no hidden multipliers):
 *
 *   1. Compute each available component on a 0–100 scale.
 *   2. Drop any component that does not have enough recorded data.
 *   3. Renormalize the remaining weights so they sum to 1.
 *   4. score = Σ (componentScore × renormalizedWeight)
 *
 * If no component can be computed, the score is "Not enough data".
 *
 * Default weights (must sum to 1.0):
 *   completionScore  0.40  actual work seconds / planned work seconds
 *   intervalScore    0.25  completed work intervals / planned work intervals
 *   repScore         0.20  actual reps / planned reps (only if any planned reps)
 *   roundScore       0.15  completed rounds / planned rounds
 */
export const SCORE_WEIGHTS = {
  completionScore: 0.4,
  intervalScore: 0.25,
  repScore: 0.2,
  roundScore: 0.15,
} as const;

export type ScoreWeightKey = keyof typeof SCORE_WEIGHTS;

export function assertScoreWeights(weights: Record<ScoreWeightKey, number>): void {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) > 1e-9) {
    throw new Error(`SCORE_WEIGHTS must sum to 1. Received ${sum}`);
  }
}

assertScoreWeights(SCORE_WEIGHTS);
