import { asId } from '../../domain/ids';
import type { Workout, WorkoutExercise } from '../../domain/types';

const t = 1_700_000_000_000;

export const STARTER_WORKOUTS: Workout[] = [
  {
    id: asId('wo-morning-hiit'),
    name: 'Morning HIIT',
    notes: 'A classic 40/20 circuit. Record reps when the exercise asks for them.',
    rounds: 5,
    isArchived: false,
    createdAt: t,
    updatedAt: t,
  },
  {
    id: asId('wo-starter'),
    name: 'First Session',
    notes: 'Shorter intervals for a first run. Same planned-versus-actual rules.',
    rounds: 3,
    isArchived: false,
    createdAt: t,
    updatedAt: t,
  },
  {
    id: asId('wo-core-finisher'),
    name: 'Core Finisher',
    notes: 'Isometric and dynamic core work. Time is the primary metric.',
    rounds: 4,
    isArchived: false,
    createdAt: t,
    updatedAt: t,
  },
];

export const STARTER_WORKOUT_EXERCISES: WorkoutExercise[] = [
  item('wo-morning-hiit', 'ex-high-knees', 0, 'TIME', 40, 20),
  item('wo-morning-hiit', 'ex-mountain-climbers', 1, 'REPS', 40, 20, 20),
  item('wo-morning-hiit', 'ex-squats', 2, 'REPS', 40, 20, 15),
  item('wo-morning-hiit', 'ex-push-ups', 3, 'REPS', 40, 20, 12),
  item('wo-morning-hiit', 'ex-burpees', 4, 'REPS', 40, 20, 8),
  item('wo-morning-hiit', 'ex-plank', 5, 'TIME', 40, 20),

  item('wo-starter', 'ex-jumping-jacks', 0, 'TIME', 30, 15),
  item('wo-starter', 'ex-squats', 1, 'REPS', 30, 15, 12),
  item('wo-starter', 'ex-high-knees', 2, 'TIME', 30, 15),
  item('wo-starter', 'ex-plank', 3, 'TIME', 20, 15),

  item('wo-core-finisher', 'ex-plank', 0, 'TIME', 40, 20),
  item('wo-core-finisher', 'ex-bicycle-crunch', 1, 'REPS', 40, 20, 20),
  item('wo-core-finisher', 'ex-flutter-kicks', 2, 'TIME', 30, 20),
  item('wo-core-finisher', 'ex-shoulder-taps', 3, 'REPS', 30, 20, 16),
];

function item(
  workoutId: string,
  exerciseId: string,
  orderIndex: number,
  trackingMode: WorkoutExercise['trackingMode'],
  plannedWorkSeconds: number,
  plannedRestSeconds: number,
  plannedReps?: number,
): WorkoutExercise {
  return {
    id: asId(`${workoutId}-${exerciseId}`),
    workoutId: asId(workoutId),
    exerciseId: asId(exerciseId),
    orderIndex,
    trackingMode,
    plannedWorkSeconds,
    plannedRestSeconds,
    plannedReps,
  };
}
