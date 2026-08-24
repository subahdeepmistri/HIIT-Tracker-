import type { User, UserSettings } from '../../domain/types';
import type { RepoContext } from './context';

export function createSettingsRepo(ctx: RepoContext) {
  return {
    get: () => ctx.snapshot().settings,
    update: async (patch: Partial<UserSettings>) => {
      ctx.snapshot().settings = { ...ctx.snapshot().settings, ...patch };
      await ctx.save();
    },
  };
}

export function createUserRepo(ctx: RepoContext) {
  return {
    get: () => ctx.snapshot().user,
    update: async (patch: Partial<User>) => {
      ctx.snapshot().user = { ...ctx.snapshot().user, ...patch };
      await ctx.save();
    },
  };
}

export type SettingsRepo = ReturnType<typeof createSettingsRepo>;
export type UserRepo = ReturnType<typeof createUserRepo>;
