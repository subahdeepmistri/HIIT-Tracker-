/**
 * Work-density labels are training language, not medical classifications.
 * Thresholds live here so they are not magic numbers in UI.
 */
export const DENSITY_THRESHOLDS = {
  high: 2,
  moderate: 1,
} as const;

export type WorkDensityLabel =
  | 'High work density'
  | 'Moderate work density'
  | 'Low work density'
  | 'Continuous work';

export function densityLabel(ratio: number | null, restSeconds: number, workSeconds: number): WorkDensityLabel | null {
  if (restSeconds === 0 && workSeconds > 0) return 'Continuous work';
  if (ratio == null || !Number.isFinite(ratio)) return null;
  if (ratio >= DENSITY_THRESHOLDS.high) return 'High work density';
  if (ratio >= DENSITY_THRESHOLDS.moderate) return 'Moderate work density';
  return 'Low work density';
}
