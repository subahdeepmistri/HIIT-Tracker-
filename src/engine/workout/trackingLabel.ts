import type { IntervalSession, TrackingMode } from '../../domain/types';

export function exerciseTrackingLine(input: {
  trackingMode: TrackingMode;
  plannedWorkSeconds: number;
  plannedRestSeconds: number;
  plannedReps?: number;
  plannedDistance?: number;
  distanceUnit?: string;
}): string {
  const interval = `${input.plannedWorkSeconds}s / ${input.plannedRestSeconds}s`;
  switch (input.trackingMode) {
    case 'TIME':
      return `TIME · ${interval}`;
    case 'REPS':
      return input.plannedReps != null
        ? `REPS · ${input.plannedReps} target · ${interval}`
        : `REPS · ${interval}`;
    case 'DISTANCE': {
      const target =
        input.plannedDistance != null
          ? `${input.plannedDistance}${input.distanceUnit ?? 'm'} target`
          : 'distance';
      return `DISTANCE · ${target}`;
    }
    case 'HYBRID': {
      const extras = [
        input.plannedReps != null ? `${input.plannedReps} reps` : null,
        input.plannedDistance != null ? `${input.plannedDistance}${input.distanceUnit ?? 'm'}` : null,
      ].filter(Boolean);
      return extras.length ? `HYBRID · ${interval} · ${extras.join(' · ')}` : `HYBRID · ${interval}`;
    }
  }
}

export function libraryTrackingLine(exercise: {
  trackingMode: TrackingMode;
  defaultWorkDurationSeconds: number;
  defaultRestDurationSeconds: number;
}): string {
  return exerciseTrackingLine({
    trackingMode: exercise.trackingMode,
    plannedWorkSeconds: exercise.defaultWorkDurationSeconds,
    plannedRestSeconds: exercise.defaultRestDurationSeconds,
  });
}

export interface PlannedActualRow {
  metric: string;
  planned: string;
  actual: string;
}

export function plannedActualRows(interval: Pick<
  IntervalSession,
  | 'plannedSeconds'
  | 'actualSeconds'
  | 'plannedReps'
  | 'actualReps'
  | 'plannedDistance'
  | 'actualDistance'
  | 'distanceUnit'
>): PlannedActualRow[] {
  const rows: PlannedActualRow[] = [
    {
      metric: 'Time',
      planned: `${interval.plannedSeconds}s`,
      actual: `${trimActual(interval.actualSeconds)}s`,
    },
  ];
  if (interval.plannedReps != null) {
    rows.push({
      metric: 'Reps',
      planned: `${interval.plannedReps} reps`,
      actual: interval.actualReps == null ? 'Not enough data' : `${interval.actualReps} reps`,
    });
  }
  if (interval.plannedDistance != null) {
    const unit = interval.distanceUnit ?? 'm';
    rows.push({
      metric: 'Distance',
      planned: `${interval.plannedDistance}${unit}`,
      actual:
        interval.actualDistance == null ? 'Not enough data' : `${interval.actualDistance}${unit}`,
    });
  }
  return rows;
}

function trimActual(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
