import { insufficient, type Metric, value } from '../../domain/metrics';

/**
 * completion = actual / planned × 100
 * Returns insufficient when planned is missing, zero, or either side is invalid.
 */
export function completionPercent(planned: number | undefined | null, actual: number | undefined | null): Metric<number> {
  if (planned == null || actual == null) return insufficient('missing value');
  if (!Number.isFinite(planned) || !Number.isFinite(actual)) return insufficient('invalid number');
  if (planned < 0 || actual < 0) return insufficient('negative value');
  if (planned === 0) return insufficient('planned is zero');
  return value((actual / planned) * 100);
}
