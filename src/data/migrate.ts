import { calculateTrainingDurationFromRecorded } from '../engine/calc/metrics';
import { DB_VERSION, type VoltSnapshot } from './schema';

export function applyMigrations(snapshot: VoltSnapshot): VoltSnapshot {
  const next: VoltSnapshot = { ...snapshot };

  if (next.version < 2) {
    next.performanceRecords = recalculateTrainingDurations(next);
    next.version = 2;
  }

  next.version = Math.max(next.version, DB_VERSION);
  return next;
}

export function recalculateTrainingDurations(
  snapshot: Pick<VoltSnapshot, 'intervals' | 'performanceRecords'>,
): VoltSnapshot['performanceRecords'] {
  return snapshot.performanceRecords.map((record) => {
    const intervals = snapshot.intervals.filter((row) => row.sessionId === record.sessionId);
    if (intervals.length === 0) return record;
    const workSeconds = sum(
      intervals.filter((row) => row.phase === 'WORK').map((row) => row.actualSeconds),
    );
    const restSeconds = sum(
      intervals
        .filter((row) => row.phase === 'REST' || row.phase === 'TRANSITION')
        .map((row) => row.actualSeconds),
    );
    return {
      ...record,
      totalDurationSeconds: calculateTrainingDurationFromRecorded(workSeconds, restSeconds),
      totalActiveSeconds: workSeconds,
      totalRestSeconds: restSeconds,
    };
  });
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
