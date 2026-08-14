import type { WorkoutExercise } from './types';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function rejectNegative(name: string, value: number | undefined | null): string | null {
  if (value == null) return null;
  if (!Number.isFinite(value)) return `${name} is not a valid number`;
  if (value < 0) return `${name} cannot be negative`;
  return null;
}

export function validateWorkoutDraft(input: {
  name: string;
  rounds: number;
  exercises: Array<Pick<
    WorkoutExercise,
    'plannedWorkSeconds' | 'plannedRestSeconds' | 'plannedReps' | 'plannedDistance'
  >>;
}): ValidationResult {
  const errors: string[] = [];

  if (!input.name.trim()) errors.push('Name is required');
  if (!Number.isInteger(input.rounds) || input.rounds < 1) {
    errors.push('Rounds must be at least 1');
  }
  if (input.exercises.length < 1) errors.push('Add at least one exercise');

  input.exercises.forEach((exercise, index) => {
    const label = `Exercise ${index + 1}`;
    const checks = [
      rejectNegative(`${label} work duration`, exercise.plannedWorkSeconds),
      rejectNegative(`${label} rest duration`, exercise.plannedRestSeconds),
      rejectNegative(`${label} reps`, exercise.plannedReps),
      rejectNegative(`${label} distance`, exercise.plannedDistance),
    ];
    checks.forEach((error) => {
      if (error) errors.push(error);
    });
  });

  const hasWork = input.exercises.some(
    (exercise) =>
      exercise.plannedWorkSeconds > 0 ||
      (exercise.plannedReps ?? 0) > 0 ||
      (exercise.plannedDistance ?? 0) > 0,
  );
  if (input.exercises.length > 0 && !hasWork) {
    errors.push('Workout needs at least one work interval greater than zero');
  }

  return { ok: errors.length === 0, errors };
}

export function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}
