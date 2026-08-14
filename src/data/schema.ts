import type {
  Exercise,
  IntervalSession,
  PerformanceRecord,
  PersonalRecord,
  TrainingDay,
  User,
  UserSettings,
  Workout,
  WorkoutExercise,
  WorkoutSession,
} from '../domain/types';

export const DB_VERSION = 1;

export interface VoltSnapshot {
  version: number;
  user: User;
  settings: UserSettings;
  exercises: Exercise[];
  workouts: Workout[];
  workoutExercises: WorkoutExercise[];
  sessions: WorkoutSession[];
  intervals: IntervalSession[];
  performanceRecords: PerformanceRecord[];
  personalRecords: PersonalRecord[];
  trainingDays: TrainingDay[];
}
