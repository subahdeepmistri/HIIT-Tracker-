import { densityLabel, type WorkDensityLabel } from '../../config/density';
import { Units } from '../../domain/units';
import { insufficient, type Metric, value } from '../../domain/metrics';

export interface WorkRestAnalysis {
  ratio: number;
  display: string;
  label: WorkDensityLabel;
}

export function workRestRatio(totalWorkSeconds: number, totalRestSeconds: number): Metric<WorkRestAnalysis> {
  if (!Number.isFinite(totalWorkSeconds) || !Number.isFinite(totalRestSeconds)) {
    return insufficient('invalid number');
  }
  if (totalWorkSeconds < 0 || totalRestSeconds < 0) return insufficient('negative value');
  if (totalRestSeconds === 0) {
    if (totalWorkSeconds > 0) {
      return value({
        ratio: Number.POSITIVE_INFINITY,
        display: 'Continuous',
        label: 'Continuous work',
      });
    }
    return insufficient('no rest recorded');
  }

  const ratio = totalWorkSeconds / totalRestSeconds;
  const label = densityLabel(ratio, totalRestSeconds, totalWorkSeconds);
  if (!label) return insufficient('cannot classify density');

  return value({
    ratio,
    display: Units.formatRatio(ratio),
    label,
  });
}
