import { localDateKey } from '../domain/date';
import type { SessionId } from '../domain/ids';
import type { TrainingDay, TrainingDayStatus, WorkoutSession } from '../domain/types';
import { rebuildPersonalRecords } from '../engine/records/personalRecords';
import type { VoltSnapshot } from './schema';

export function applySessionDelete(snapshot: VoltSnapshot, sessionId: SessionId): VoltSnapshot {
  const sessions = snapshot.sessions.filter((row) => row.id !== sessionId);
  const intervals = snapshot.intervals.filter((row) => row.sessionId !== sessionId);
  const performanceRecords = snapshot.performanceRecords.filter((row) => row.sessionId !== sessionId);
  return {
    ...snapshot,
    sessions,
    intervals,
    performanceRecords,
    personalRecords: rebuildPersonalRecords(sessions, intervals),
    trainingDays: trainingDaysFromSessions(sessions, snapshot.trainingDays),
  };
}

export function trainingDaysFromSessions(
  sessions: WorkoutSession[],
  existing: TrainingDay[],
): TrainingDay[] {
  const byDate = new Map<string, WorkoutSession[]>();
  for (const session of sessions) {
    if (session.status === 'CANCELLED' || session.status === 'IN_PROGRESS') continue;
    const date = localDateKey(session.endedAt ?? session.startedAt);
    const list = byDate.get(date) ?? [];
    list.push(session);
    byDate.set(date, list);
  }
  const next: TrainingDay[] = existing.filter((row) => row.status === 'REST' && !byDate.has(row.date));
  for (const [date, list] of byDate) {
    const status: TrainingDayStatus = list.some((row) => row.status === 'COMPLETED')
      ? 'COMPLETED'
      : 'PARTIAL';
    next.push({ date, status, sessionIds: list.map((row) => row.id) });
  }
  return next;
}
