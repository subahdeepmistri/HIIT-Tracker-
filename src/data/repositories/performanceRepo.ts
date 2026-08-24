import type { SessionId } from '../../domain/ids';
import type { PerformanceRecord } from '../../domain/types';
import type { RepoContext } from './context';

export function createPerformanceRepo(ctx: RepoContext) {
  return {
    getBySession: (id: SessionId) =>
      ctx.snapshot().performanceRecords.find((row) => row.sessionId === id),
    list: () => [...ctx.snapshot().performanceRecords].sort((a, b) => b.createdAt - a.createdAt),
    upsert: async (record: PerformanceRecord) => {
      const index = ctx
        .snapshot()
        .performanceRecords.findIndex((row) => row.id === record.id);
      if (index >= 0) ctx.snapshot().performanceRecords[index] = record;
      else ctx.snapshot().performanceRecords.push(record);
      await ctx.save();
    },
  };
}

export type PerformanceRepo = ReturnType<typeof createPerformanceRepo>;
