import type {
  ExerciseId,
  IntervalId,
  PerformanceRecordId,
  PersonalRecordId,
  SessionId,
  UserId,
  WorkoutExerciseId,
  WorkoutId,
} from './ids';

export type TrackingMode = 'TIME' | 'REPS' | 'DISTANCE' | 'HYBRID';

export type ExerciseCategory =
  | 'Cardio'
  | 'Bodyweight'
  | 'Core'
  | 'Lower Body'
  | 'Upper Body'
  | 'Full Body'
  | 'Plyometric'
  | 'Conditioning';

export type MovementType =
  | 'isometric'
  | 'dynamic'
  | 'plyometric'
  | 'locomotion'
  | 'cyclical'
  | 'strength';

export type Equipment =
  | 'none'
  | 'jump-rope'
  | 'dumbbells'
  | 'kettlebell'
  | 'bike'
  | 'treadmill'
  | 'battle-rope'
  | 'box'
  | 'mat';

export type WorkoutPhase =
  | 'IDLE'
  | 'COUNTDOWN'
  | 'WORK'
  | 'REST'
  | 'TRANSITION'
  | 'ROUND_COMPLETE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED';

export type SessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'PARTIAL' | 'CANCELLED';
export type IntervalPhase = 'WORK' | 'REST' | 'TRANSITION';
export type IntervalOutcome = 'COMPLETED' | 'SKIPPED' | 'PARTIAL' | 'CANCELLED';
export type ThemePreference = 'system' | 'light' | 'dark';
export type DistanceUnit = 'm' | 'km' | 'mi';
export type TrainingDayStatus = 'COMPLETED' | 'PARTIAL' | 'MISSED' | 'REST' | 'NONE';

export type PersonalRecordKind =
  | 'LONGEST_WORK_INTERVAL'
  | 'MOST_REPS_EXERCISE'
  | 'MOST_COMPLETED_ROUNDS'
  | 'FASTEST_DISTANCE'
  | 'HIGHEST_WORKOUT_COMPLETION'
  | 'LONGEST_ACTIVE_TIME'
  | 'BEST_EXERCISE_COMPLETION';

export interface User {
  id: UserId;
  displayName?: string;
  onboardingCompletedAt?: number;
  onboardingStep?: number;
  onboardingVersion?: number;
  createdAt: number;
}

export interface UserSettings {
  theme: ThemePreference;
  distanceUnit: DistanceUnit;
  countdownSeconds: number;
  defaultWorkSeconds: number;
  defaultRestSeconds: number;
  defaultRounds: number;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  countdownSound: boolean;
  restEndingAlert: boolean;
  completionSound: boolean;
  hapticIntervalChanges?: boolean;
  hapticCountdown?: boolean;
  hapticComplete?: boolean;
  remindersEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  reducedMotion: boolean;
}

export interface Exercise {
  id: ExerciseId;
  name: string;
  category: ExerciseCategory;
  movementType: MovementType;
  equipment: Equipment[];
  defaultWorkDurationSeconds: number;
  defaultRestDurationSeconds: number;
  trackingMode: TrackingMode;
  instructions: string;
  safetyNotes: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  isCustom: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Workout {
  id: WorkoutId;
  name: string;
  notes: string;
  rounds: number;
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface WorkoutExercise {
  id: WorkoutExerciseId;
  workoutId: WorkoutId;
  exerciseId: ExerciseId;
  orderIndex: number;
  trackingMode: TrackingMode;
  plannedWorkSeconds: number;
  plannedRestSeconds: number;
  plannedReps?: number;
  plannedDistance?: number;
  distanceUnit?: DistanceUnit;
  notes?: string;
}

export interface WorkoutSession {
  id: SessionId;
  workoutId: WorkoutId;
  workoutNameSnapshot: string;
  status: SessionStatus;
  startedAt: number;
  endedAt?: number;
  countdownSecondsUsed: number;
  plannedRounds: number;
  plannedExerciseCount: number;
  interruptedAt?: number;
  resumePayloadJson?: string;
  averageHeartRate?: number | null;
  maximumHeartRate?: number | null;
  heartRateSamplesJson?: string | null;
}

export interface IntervalSession {
  id: IntervalId;
  sessionId: SessionId;
  exerciseId: ExerciseId;
  exerciseNameSnapshot: string;
  roundIndex: number;
  exerciseIndex: number;
  phase: IntervalPhase;
  plannedSeconds: number;
  actualSeconds: number;
  plannedReps?: number;
  actualReps?: number;
  plannedDistance?: number;
  actualDistance?: number;
  distanceUnit?: DistanceUnit;
  startedAt: number;
  endedAt: number;
  outcome: IntervalOutcome;
}

export interface PerformanceRecord {
  id: PerformanceRecordId;
  sessionId: SessionId;
  workoutId: WorkoutId;
  createdAt: number;
  totalDurationSeconds: number;
  totalActiveSeconds: number;
  totalRestSeconds: number;
  exerciseCount: number;
  completedRounds: number;
  completedIntervals: number;
  plannedWorkSeconds: number;
  plannedRestSeconds: number;
  plannedReps?: number;
  plannedIntervals?: number;
  plannedRounds?: number;
  plannedDistanceMeters?: number;
  actualDistanceMeters?: number;
  totalReps?: number;
  workCompletionPercent?: number;
  repCompletionPercent?: number;
  intervalCompletionRate?: number;
  roundCompletionPercent?: number;
  distanceCompletionPercent?: number;
  workRestRatio?: number;
  performanceScore?: number;
  bestIntervalId?: IntervalId;
  weakestIntervalId?: IntervalId;
}

export interface PersonalRecord {
  id: PersonalRecordId;
  kind: PersonalRecordKind;
  exerciseId?: ExerciseId;
  workoutId?: WorkoutId;
  value: number;
  unit: string;
  sessionId: SessionId;
  earnedAt: number;
}

export interface TrainingDay {
  date: string;
  status: TrainingDayStatus;
  sessionIds: SessionId[];
}

export interface WorkoutPlan {
  workout: Workout;
  exercises: Array<WorkoutExercise & { exercise: Exercise }>;
}
