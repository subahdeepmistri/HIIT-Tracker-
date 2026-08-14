import type { IntervalSession, PerformanceRecord, WorkoutSession } from '../domain/types';
import { completionPercent } from '../engine/calc/completion';
import { isValue } from '../domain/metrics';

export interface ExportRow {
  date: string;
  workout: string;
  exercise: string;
  round: number;
  phase: string;
  plannedDuration: number;
  actualDuration: number;
  plannedReps: number | '';
  actualReps: number | '';
  distance: number | '';
  completionPercentage: number | '';
  derived: boolean;
}

export function buildExportRows(
  sessions: WorkoutSession[],
  intervals: IntervalSession[],
): ExportRow[] {
  const rows: ExportRow[] = [];
  for (const session of sessions) {
    if (session.status === 'IN_PROGRESS' || session.status === 'CANCELLED') continue;
    const date = new Date(session.endedAt ?? session.startedAt).toISOString();
    const sessionIntervals = intervals.filter((row) => row.sessionId === session.id);
    for (const interval of sessionIntervals) {
      const completion = completionPercent(interval.plannedSeconds, interval.actualSeconds);
      rows.push({
        date,
        workout: session.workoutNameSnapshot,
        exercise: interval.exerciseNameSnapshot,
        round: interval.roundIndex,
        phase: interval.phase,
        plannedDuration: interval.plannedSeconds,
        actualDuration: interval.actualSeconds,
        plannedReps: interval.plannedReps ?? '',
        actualReps: interval.actualReps ?? '',
        distance: interval.actualDistance ?? '',
        completionPercentage: isValue(completion) ? completion.value : '',
        derived: true,
      });
    }
  }
  return rows;
}

export function toCsv(rows: ExportRow[]): string {
  const headers = [
    'date',
    'workout',
    'exercise',
    'round',
    'phase',
    'plannedDuration',
    'actualDuration',
    'plannedReps',
    'actualReps',
    'distance',
    'completionPercentage',
    'derived',
  ];
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(
      headers
        .map((key) => csvEscape(String(row[key as keyof ExportRow] ?? '')))
        .join(','),
    );
  }
  return lines.join('\n');
}

export function toJson(input: {
  exportedAt: string;
  note: string;
  sessions: WorkoutSession[];
  intervals: IntervalSession[];
  performance: PerformanceRecord[];
  rows: ExportRow[];
}): string {
  return JSON.stringify(input, null, 2);
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
