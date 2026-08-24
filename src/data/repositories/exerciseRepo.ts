import type { Exercise } from '../../domain/types';
import type { RepoContext } from './context';

export function createExerciseRepo(ctx: RepoContext) {
  return {
    list: () => ctx.snapshot().exercises.filter((row) => true),
    get: (id: Exercise['id']) => ctx.snapshot().exercises.find((row) => row.id === id),
    upsert: async (exercise: Exercise) => {
      const index = ctx.snapshot().exercises.findIndex((row) => row.id === exercise.id);
      if (index >= 0) ctx.snapshot().exercises[index] = exercise;
      else ctx.snapshot().exercises.push(exercise);
      await ctx.save();
    },
    search: (query: string, category?: Exercise['category']) => {
      const q = query.trim().toLowerCase();
      return ctx.snapshot().exercises.filter((row) => {
        if (category && row.category !== category) return false;
        if (!q) return true;
        return (
          row.name.toLowerCase().includes(q) ||
          row.category.toLowerCase().includes(q) ||
          row.instructions.toLowerCase().includes(q)
        );
      });
    },
  };
}

export type ExerciseRepo = ReturnType<typeof createExerciseRepo>;
