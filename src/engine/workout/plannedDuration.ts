import type { Workout, WorkoutExercise } from '../../domain/types';
import { planWorkout } from './planner';

export function plannedDurationForDraft(input: {
  name: string;
  rounds: number;
  countdownSeconds: number;
  items: WorkoutExercise[];
}): number {
  const workout = {
    id: 'draft',
    name: input.name,
    notes: '',
    rounds: input.rounds,
    isArchived: false,
    createdAt: 0,
    updatedAt: 0,
  } as Workout;
  return planWorkout({
    workout,
    items: input.items.map((item) => ({
      ...item,
      exercise: {
        id: item.exerciseId,
        name: 'Exercise',
        category: 'Conditioning',
        movementType: 'dynamic',
        equipment: ['none'],
        defaultWorkDurationSeconds: item.plannedWorkSeconds,
        defaultRestDurationSeconds: item.plannedRestSeconds,
        trackingMode: item.trackingMode,
        instructions: '',
        safetyNotes: '',
        difficulty: 1,
        isCustom: false,
        createdAt: 0,
        updatedAt: 0,
      },
    })),
    countdownSeconds: input.countdownSeconds,
  }).plannedDurationSeconds;
}

export { calculateRestDuration, calculateTrainingDuration, calculateWorkDuration } from './planner';
export { calculateTrainingDurationFromRecorded } from '../calc/metrics';
