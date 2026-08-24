import type { SessionId, WorkoutId } from '../../domain/ids';
import type { WorkoutSession } from '../../domain/types';
import type { RepoContext } from './context';
import { applySessionDelete } from '../deleteSession';

export function createSessionRepo(ctx: RepoContext) {
  return {
    list: () =>
      [...ctx.snapshot().sessions].sort(
        (a, b) => (b.endedAt ?? b.startedAt) - (a.endedAt ?? a.startedAt),
      ),
    get: (id: SessionId) => ctx.snapshot().sessions.find((row) => row.id === id),
    inProgress: () => ctx.snapshot().sessions.find((row) => row.status === 'IN_PROGRESS'),
    upsert: async (session: WorkoutSession, options?: { notify?: boolean }) => {
      const index = ctx.snapshot().sessions.findIndex((row) => row.id === session.id);
      if (index >= 0) ctx.snapshot().sessions[index] = session;
      else ctx.snapshot().sessions.push(session);
      await ctx.save(options);
    },
    remove: async (id: SessionId) => {
      ctx.snapshot().sessions = ctx.snapshot().sessions.filter((row) => row.id !== id);
      await ctx.save();
    },
    /** Cascading delete: session + intervals + performance + PR/training-day rebuild. */
    delete: async (id: SessionId) => {
      ctx.setSnapshot(applySessionDelete(ctx.snapshot(), id));
      await ctx.save();
    },
  };
}

export type SessionRepo = ReturnType<typeof createSessionRepo>;
export type { WorkoutId };
