import { DEFAULTS } from '../../config/defaults';
import type { Exercise, TrackingMode, Workout, WorkoutExercise } from '../../domain/types';

export interface PlannedSlot {
  slotId: string;
  roundIndex: number;
  exerciseIndex: number;
  phase: 'WORK' | 'REST' | 'TRANSITION';
  exerciseId: string;
  exerciseName: string;
  trackingMode: TrackingMode;
  plannedSeconds: number;
  plannedReps?: number;
  plannedDistance?: number;
  distanceUnit?: WorkoutExercise['distanceUnit'];
  nextExerciseId?: string;
  nextExerciseName?: string;
  isLastInRound: boolean;
  isLastInWorkout: boolean;
}

export interface PlannedWorkout {
  workoutId: string;
  workoutName: string;
  rounds: number;
  exerciseCount: number;
  countdownSeconds: number;
  slots: PlannedSlot[];
  plannedWorkSeconds: number;
  plannedRestSeconds: number;
  plannedDurationSeconds: number;
}

export interface PlannerInput {
  workout: Workout;
  items: Array<WorkoutExercise & { exercise: Exercise }>;
  countdownSeconds: number;
  transitionSeconds?: number;
}

export function planWorkout(input: PlannerInput): PlannedWorkout {
  const items = [...input.items].sort((a, b) => a.orderIndex - b.orderIndex);
  const slots: PlannedSlot[] = [];
  const rounds = Math.max(1, input.workout.rounds);
  const transitionSeconds = input.transitionSeconds ?? DEFAULTS.transitionSeconds;

  for (let round = 1; round <= rounds; round += 1) {
    items.forEach((item, exerciseIndex) => {
      const isLastExercise = exerciseIndex === items.length - 1;
      const isLastRound = round === rounds;
      const isLastInWorkout = isLastExercise && isLastRound;
      const nextItem = !isLastExercise ? items[exerciseIndex + 1] : !isLastRound ? items[0] : undefined;

      slots.push({
        slotId: `r${round}-e${exerciseIndex}-work`,
        roundIndex: round,
        exerciseIndex,
        phase: 'WORK',
        exerciseId: item.exerciseId,
        exerciseName: item.exercise.name,
        trackingMode: item.trackingMode,
        plannedSeconds: item.plannedWorkSeconds,
        plannedReps: item.plannedReps,
        plannedDistance: item.plannedDistance,
        distanceUnit: item.distanceUnit,
        nextExerciseId: nextItem?.exercise.id,
        nextExerciseName: nextItem?.exercise.name,
        isLastInRound: isLastExercise,
        isLastInWorkout,
      });

      if (!isLastInWorkout) {
        if (item.plannedRestSeconds > 0) {
          slots.push({
            slotId: `r${round}-e${exerciseIndex}-rest`,
            roundIndex: round,
            exerciseIndex,
            phase: 'REST',
            exerciseId: item.exerciseId,
            exerciseName: item.exercise.name,
            trackingMode: item.trackingMode,
            plannedSeconds: item.plannedRestSeconds,
            nextExerciseId: nextItem?.exercise.id,
            nextExerciseName: nextItem?.exercise.name,
            isLastInRound: isLastExercise,
            isLastInWorkout: false,
          });
        } else if (transitionSeconds > 0) {
          slots.push({
            slotId: `r${round}-e${exerciseIndex}-transition`,
            roundIndex: round,
            exerciseIndex,
            phase: 'TRANSITION',
            exerciseId: item.exerciseId,
            exerciseName: item.exercise.name,
            trackingMode: item.trackingMode,
            plannedSeconds: transitionSeconds,
            nextExerciseId: nextItem?.exercise.id,
            nextExerciseName: nextItem?.exercise.name,
            isLastInRound: isLastExercise,
            isLastInWorkout: false,
          });
        }
      }
    });
  }

  const plannedWorkSeconds = slots
    .filter((slot) => slot.phase === 'WORK')
    .reduce((sum, slot) => sum + slot.plannedSeconds, 0);
  const plannedRestSeconds = slots
    .filter((slot) => slot.phase === 'REST' || slot.phase === 'TRANSITION')
    .reduce((sum, slot) => sum + slot.plannedSeconds, 0);

  return {
    workoutId: input.workout.id,
    workoutName: input.workout.name,
    rounds,
    exerciseCount: items.length,
    countdownSeconds: input.countdownSeconds,
    slots,
    plannedWorkSeconds,
    plannedRestSeconds,
    plannedDurationSeconds:
      input.countdownSeconds + plannedWorkSeconds + plannedRestSeconds,
  };
}

export function plannedDurationSeconds(input: PlannerInput): number {
  return planWorkout(input).plannedDurationSeconds;
}
