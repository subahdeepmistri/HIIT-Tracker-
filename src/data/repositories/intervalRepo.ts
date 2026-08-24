import type { SessionId } from '../../domain/ids';
import type { IntervalSession } from '../../domain/types';
import type { RepoContext } from './context';

export function createIntervalRepo(ctx: RepoContext) {
  return {
    /** O(1) snapshot access — callers index once instead of N listBySession scans. */
    listAll: (): IntervalSession[] => ctx.snapshot().intervals,
    listBySession: (id: SessionId) =>
      ctx
        .snapshot()
        .intervals.filter((row) => row.sessionId === id)
        .sort((a, b) => a.startedAt - b.startedAt),
    replaceSession: async (
      id: SessionId,
      rows: IntervalSession[],
      options?: { notify?: boolean },
    ) => {
      ctx.snapshot().intervals = [
        ...ctx.snapshot().intervals.filter((row) => row.sessionId !== id),
        ...rows,
      ];
      await ctx.save(options);
    },
    removeBySession: async (id: SessionId) => {
      ctx.snapshot().intervals = ctx.snapshot().intervals.filter((row) => row.sessionId !== id);
      await ctx.save();
    },
  };
}

export type IntervalRepo = ReturnType<typeof createIntervalRepo>;
