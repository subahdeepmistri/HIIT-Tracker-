import type { PersonalRecord } from '../../domain/types';
import type { RepoContext } from './context';

export function createRecordsRepo(ctx: RepoContext) {
  return {
    list: () => ctx.snapshot().personalRecords,
    replaceAll: async (rows: PersonalRecord[]) => {
      ctx.snapshot().personalRecords = rows;
      await ctx.save();
    },
  };
}

export type RecordsRepo = ReturnType<typeof createRecordsRepo>;
