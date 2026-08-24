import type { Exercise, Workout, WorkoutExercise, WorkoutPlan } from '../../domain/types';
import type { WorkoutId } from '../../domain/ids';
import type { RepoContext } from './context';

export function createWorkoutRepo(ctx: RepoContext) {
  return {
    list: () => ctx.snapshot().workouts.filter((row) => !row.isArchived),
    get: (id: WorkoutId) => ctx.snapshot().workouts.find((row) => row.id === id),
    plan: (id: WorkoutId): WorkoutPlan | null => {
      const workout = ctx.snapshot().workouts.find((row) => row.id === id);
      if (!workout) return null;
      const items = ctx
        .snapshot()
        .workoutExercises.filter((row) => row.workoutId === id)
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((row) => {
          const exercise = ctx.snapshot().exercises.find((item) => item.id === row.exerciseId);
          if (!exercise) return null;
          return { ...row, exercise };
        })
        .filter((row): row is WorkoutExercise & { exercise: Exercise } => row != null);
      return { workout, exercises: items };
    },
    upsert: async (workout: Workout, items: WorkoutExercise[]) => {
      const index = ctx.snapshot().workouts.findIndex((row) => row.id === workout.id);
      if (index >= 0) ctx.snapshot().workouts[index] = workout;
      else ctx.snapshot().workouts.push(workout);
      ctx.snapshot().workoutExercises = [
        ...ctx.snapshot().workoutExercises.filter((row) => row.workoutId !== workout.id),
        ...items,
      ];
      await ctx.save();
    },
    archive: async (id: WorkoutId) => {
      const workout = ctx.snapshot().workouts.find((row) => row.id === id);
      if (!workout) return;
      workout.isArchived = true;
      workout.updatedAt = Date.now();
      await ctx.save();
    },
  };
}

export type WorkoutRepo = ReturnType<typeof createWorkoutRepo>;
