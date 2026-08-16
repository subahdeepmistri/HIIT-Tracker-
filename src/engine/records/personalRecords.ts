import { createId } from '../../domain/ids';
import type { IntervalSession, PersonalRecord, PersonalRecordKind, WorkoutSession } from '../../domain/types';
import { isValue } from '../../domain/metrics';
import { Units } from '../../domain/units';
import { calculateSessionMetrics } from '../calc/metrics';

export interface RecordCandidate {
  kind: PersonalRecordKind;
  exerciseId?: PersonalRecord['exerciseId'];
  workoutId?: PersonalRecord['workoutId'];
  value: number;
  unit: string;
  higherIsBetter: boolean;
}

export function detectPersonalRecords(input: {
  session: WorkoutSession;
  intervals: IntervalSession[];
  existing: PersonalRecord[];
}): PersonalRecord[] {
  const { session, intervals, existing } = input;
  const metrics = calculateSessionMetrics(session, intervals, session.endedAt ?? Date.now());
  const candidates: RecordCandidate[] = [];

  const completedWork = intervals.filter((row) => row.phase === 'WORK' && row.outcome === 'COMPLETED' && row.actualSeconds > 0);
  if (completedWork.length > 0) {
    const longest = completedWork.reduce((best, row) => (row.actualSeconds > best.actualSeconds ? row : best));
    candidates.push({
      kind: 'LONGEST_WORK_INTERVAL',
      value: longest.actualSeconds,
      unit: 's',
      higherIsBetter: true,
    });
  }

  const repsByExercise = new Map<string, { reps: number; exerciseId: PersonalRecord['exerciseId'] }>();
  for (const row of intervals) {
    if (row.phase !== 'WORK' || row.outcome === 'SKIPPED' || row.outcome === 'CANCELLED') continue;
    if (row.actualReps == null || row.actualReps <= 0) continue;
    const current = repsByExercise.get(row.exerciseId) ?? { reps: 0, exerciseId: row.exerciseId };
    current.reps = Math.max(current.reps, row.actualReps);
    repsByExercise.set(row.exerciseId, current);
  }
  for (const entry of repsByExercise.values()) {
    candidates.push({
      kind: 'MOST_REPS_EXERCISE',
      exerciseId: entry.exerciseId,
      value: entry.reps,
      unit: 'reps',
      higherIsBetter: true,
    });
  }

  if (isValue(metrics.completedRounds) && metrics.completedRounds.value > 0) {
    candidates.push({
      kind: 'MOST_COMPLETED_ROUNDS',
      value: metrics.completedRounds.value,
      unit: 'rounds',
      higherIsBetter: true,
    });
  }

  const distanceRows = intervals.filter(
    (row) =>
      row.phase === 'WORK' &&
      row.outcome === 'COMPLETED' &&
      row.actualDistance != null &&
      row.actualDistance > 0 &&
      row.actualSeconds > 0,
  );
  for (const row of distanceRows) {
    const meters = Units.toMeters(row.actualDistance!, row.distanceUnit ?? 'm');
    const metersPerSecond = meters / row.actualSeconds;
    candidates.push({
      kind: 'FASTEST_DISTANCE',
      exerciseId: row.exerciseId,
      value: metersPerSecond,
      unit: 'm/s',
      higherIsBetter: true,
    });
  }

  if (isValue(metrics.workCompletionPercent)) {
    candidates.push({
      kind: 'HIGHEST_WORKOUT_COMPLETION',
      workoutId: session.workoutId,
      value: metrics.workCompletionPercent.value,
      unit: '%',
      higherIsBetter: true,
    });
  }

  if (isValue(metrics.totalActiveSeconds) && metrics.totalActiveSeconds.value > 0) {
    candidates.push({
      kind: 'LONGEST_ACTIVE_TIME',
      value: metrics.totalActiveSeconds.value,
      unit: 's',
      higherIsBetter: true,
    });
  }

  const exerciseCompletion = new Map<string, { planned: number; actual: number; exerciseId: PersonalRecord['exerciseId'] }>();
  for (const row of completedWork) {
    if (row.plannedSeconds <= 0) continue;
    const current = exerciseCompletion.get(row.exerciseId) ?? {
      planned: 0,
      actual: 0,
      exerciseId: row.exerciseId,
    };
    current.planned += row.plannedSeconds;
    current.actual += row.actualSeconds;
    exerciseCompletion.set(row.exerciseId, current);
  }
  for (const entry of exerciseCompletion.values()) {
    if (entry.planned <= 0) continue;
    candidates.push({
      kind: 'BEST_EXERCISE_COMPLETION',
      exerciseId: entry.exerciseId,
      value: (entry.actual / entry.planned) * 100,
      unit: '%',
      higherIsBetter: true,
    });
  }

  const earned: PersonalRecord[] = [];
  for (const candidate of candidates) {
    if (!Number.isFinite(candidate.value) || candidate.value <= 0) continue;
    const match = existing.find(
      (row) =>
        row.kind === candidate.kind &&
        row.exerciseId === candidate.exerciseId &&
        row.workoutId === candidate.workoutId,
    );
    const isBetter = !match || (candidate.higherIsBetter ? candidate.value > match.value : candidate.value < match.value);
    if (!isBetter) continue;
    earned.push({
      id: createId(),
      kind: candidate.kind,
      exerciseId: candidate.exerciseId,
      workoutId: candidate.workoutId,
      value: candidate.value,
      unit: candidate.unit,
      sessionId: session.id,
      earnedAt: session.endedAt ?? Date.now(),
    });
  }
  return earned;
}

export function recordKindLabel(kind: PersonalRecordKind): string {
  switch (kind) {
    case 'LONGEST_WORK_INTERVAL':
      return 'Longest work interval';
    case 'MOST_REPS_EXERCISE':
      return 'Most reps';
    case 'MOST_COMPLETED_ROUNDS':
      return 'Most completed rounds';
    case 'FASTEST_DISTANCE':
      return 'Fastest distance';
    case 'HIGHEST_WORKOUT_COMPLETION':
      return 'Highest completion';
    case 'LONGEST_ACTIVE_TIME':
      return 'Longest active time';
    case 'BEST_EXERCISE_COMPLETION':
      return 'Best exercise completion';
  }
}

export function formatRecordValue(record: PersonalRecord): string {
  switch (record.unit) {
    case 's':
      return Units.formatCompactDuration(record.value);
    case '%':
      return Units.formatPercent(record.value);
    case 'm/s':
      return `${record.value.toFixed(2)} m/s`;
    case 'reps':
      return `${Math.round(record.value)} reps`;
    case 'rounds':
      return `${Math.round(record.value)} rounds`;
    default:
      return `${trim(record.value)} ${record.unit}`;
  }
}

function trim(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function rebuildPersonalRecords(
  sessions: WorkoutSession[],
  intervals: IntervalSession[],
): PersonalRecord[] {
  const ordered = sessions
    .filter((session) => session.status === 'COMPLETED' || session.status === 'PARTIAL')
    .sort((a, b) => (a.endedAt ?? a.startedAt) - (b.endedAt ?? b.startedAt));
  let records: PersonalRecord[] = [];
  for (const session of ordered) {
    const earned = detectPersonalRecords({
      session,
      intervals: intervals.filter((row) => row.sessionId === session.id),
      existing: records,
    });
    records = applyPersonalRecords(records, earned);
  }
  return records;
}

export function applyPersonalRecords(
  existing: PersonalRecord[],
  earned: PersonalRecord[],
): PersonalRecord[] {
  const next = [...existing];
  for (const record of earned) {
    const index = next.findIndex(
      (row) => row.kind === record.kind && row.exerciseId === record.exerciseId && row.workoutId === record.workoutId,
    );
    if (index >= 0) next[index] = record;
    else next.push(record);
  }
  return next;
}

