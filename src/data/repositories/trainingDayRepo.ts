import { localDateKey } from '../../domain/date';
import type { TrainingDay, TrainingDayStatus, WorkoutSession } from '../../domain/types';
import type { RepoContext } from './context';

export function createTrainingDayRepo(ctx: RepoContext) {
  return {
    list: () => ctx.snapshot().trainingDays,
    markRest: async (date: string) => {
      const existing = ctx.snapshot().trainingDays.find((row) => row.date === date);
      if (existing) existing.status = 'REST';
      else ctx.snapshot().trainingDays.push({ date, status: 'REST', sessionIds: [] });
      await ctx.save();
    },
    syncFromSessions: async (sessions: WorkoutSession[]) => {
      const byDate = new Map<string, WorkoutSession[]>();
      for (const session of sessions) {
        if (session.status === 'CANCELLED' || session.status === 'IN_PROGRESS') continue;
        const date = localDateKey(session.endedAt ?? session.startedAt);
        const list = byDate.get(date) ?? [];
        list.push(session);
        byDate.set(date, list);
      }
      const restDays = ctx
        .snapshot()
        .trainingDays.filter((row) => row.status === 'REST' && !byDate.has(row.date));
      const next: TrainingDay[] = restDays;
      for (const [date, list] of byDate) {
        const status: TrainingDayStatus = list.some((row) => row.status === 'COMPLETED')
          ? 'COMPLETED'
          : 'PARTIAL';
        next.push({ date, status, sessionIds: list.map((row) => row.id) });
      }
      ctx.snapshot().trainingDays = next;
      await ctx.save();
    },
  };
}

export type TrainingDayRepo = ReturnType<typeof createTrainingDayRepo>;
