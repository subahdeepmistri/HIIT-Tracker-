import { z } from 'zod';
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

// All IDs are strings at runtime; branded types are TypeScript-only
const idSchema = z.string().min(1);

// Difficulty is a union of 1-5
const difficultySchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);

// Raw schemas without branded type constraints (validated at boundary)
export const ExerciseSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  category: z.enum([
    'Cardio', 'Bodyweight', 'Core', 'Lower Body', 'Upper Body',
    'Full Body', 'Plyometric', 'Conditioning'
  ]),
  movementType: z.enum(['isometric', 'dynamic', 'plyometric', 'locomotion', 'cyclical', 'strength']),
  equipment: z.array(z.enum(['none', 'jump-rope', 'dumbbells', 'kettlebell', 'bike', 'treadmill', 'battle-rope', 'box', 'mat'])),
  defaultWorkDurationSeconds: z.number().int().positive(),
  defaultRestDurationSeconds: z.number().int().nonnegative(),
  trackingMode: z.enum(['TIME', 'REPS', 'DISTANCE', 'HYBRID']),
  instructions: z.string(),
  safetyNotes: z.string(),
  difficulty: difficultySchema,
  isCustom: z.boolean(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export const WorkoutSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  notes: z.string(),
  rounds: z.number().int().positive(),
  isArchived: z.boolean(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export const WorkoutExerciseSchema = z.object({
  id: idSchema,
  workoutId: idSchema,
  exerciseId: idSchema,
  orderIndex: z.number().int().nonnegative(),
  trackingMode: z.enum(['TIME', 'REPS', 'DISTANCE', 'HYBRID']),
  plannedWorkSeconds: z.number().int().positive(),
  plannedRestSeconds: z.number().int().nonnegative(),
  plannedReps: z.number().int().positive().optional(),
  plannedDistance: z.number().positive().optional(),
  distanceUnit: z.enum(['m', 'km', 'mi']).optional(),
  notes: z.string().optional(),
});

export const WorkoutSessionSchema = z.object({
  id: idSchema,
  workoutId: idSchema,
  workoutNameSnapshot: z.string(),
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'PARTIAL', 'CANCELLED']),
  startedAt: z.number().int().positive(),
  endedAt: z.number().int().positive().optional(),
  countdownSecondsUsed: z.number().int().nonnegative(),
  plannedRounds: z.number().int().positive(),
  plannedExerciseCount: z.number().int().positive(),
  interruptedAt: z.number().int().positive().optional(),
  resumePayloadJson: z.string().optional(),
  averageHeartRate: z.number().nullable().optional(),
  maximumHeartRate: z.number().nullable().optional(),
  heartRateSamplesJson: z.string().nullable().optional(),
});

export const IntervalSessionSchema = z.object({
  id: idSchema,
  sessionId: idSchema,
  exerciseId: idSchema,
  exerciseNameSnapshot: z.string(),
  roundIndex: z.number().int().positive(),
  exerciseIndex: z.number().int().nonnegative(),
  phase: z.enum(['WORK', 'REST', 'TRANSITION']),
  plannedSeconds: z.number().int().nonnegative(),
  actualSeconds: z.number().int().nonnegative(),
  plannedReps: z.number().int().positive().optional(),
  actualReps: z.number().int().nonnegative().optional(),
  plannedDistance: z.number().positive().optional(),
  actualDistance: z.number().positive().optional(),
  distanceUnit: z.enum(['m', 'km', 'mi']).optional(),
  startedAt: z.number().int().positive(),
  endedAt: z.number().int().positive(),
  outcome: z.enum(['COMPLETED', 'SKIPPED', 'PARTIAL', 'CANCELLED']),
});

export const PerformanceRecordSchema = z.object({
  id: idSchema,
  sessionId: idSchema,
  workoutId: idSchema,
  createdAt: z.number().int().positive(),
  totalDurationSeconds: z.number().nonnegative(),
  totalActiveSeconds: z.number().nonnegative(),
  totalRestSeconds: z.number().nonnegative(),
  exerciseCount: z.number().int().nonnegative(),
  completedRounds: z.number().int().nonnegative(),
  completedIntervals: z.number().int().nonnegative(),
  plannedWorkSeconds: z.number().nonnegative(),
  plannedRestSeconds: z.number().nonnegative(),
  plannedReps: z.number().int().positive().optional(),
  plannedIntervals: z.number().int().nonnegative().optional(),
  plannedRounds: z.number().int().positive().optional(),
  plannedDistanceMeters: z.number().positive().optional(),
  actualDistanceMeters: z.number().positive().optional(),
  totalReps: z.number().int().nonnegative().optional(),
  workCompletionPercent: z.number().optional(),
  repCompletionPercent: z.number().optional(),
  intervalCompletionRate: z.number().optional(),
  roundCompletionPercent: z.number().optional(),
  distanceCompletionPercent: z.number().optional(),
  workRestRatio: z.number().optional(),
  performanceScore: z.number().optional(),
  bestIntervalId: z.string().optional(),
  weakestIntervalId: z.string().optional(),
});

export const PersonalRecordSchema = z.object({
  id: idSchema,
  kind: z.enum([
    'LONGEST_WORK_INTERVAL',
    'MOST_REPS_EXERCISE',
    'MOST_COMPLETED_ROUNDS',
    'FASTEST_DISTANCE',
    'HIGHEST_WORKOUT_COMPLETION',
    'LONGEST_ACTIVE_TIME',
    'BEST_EXERCISE_COMPLETION',
  ]),
  exerciseId: z.string().optional(),
  workoutId: z.string().optional(),
  value: z.number(),
  unit: z.string(),
  sessionId: idSchema,
  earnedAt: z.number().int().positive(),
});

export const TrainingDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['COMPLETED', 'PARTIAL', 'MISSED', 'REST', 'NONE']),
  sessionIds: z.array(idSchema),
});

const UserSettingsSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']),
  distanceUnit: z.enum(['m', 'km', 'mi']),
  countdownSeconds: z.number().int().nonnegative(),
  defaultWorkSeconds: z.number().int().positive(),
  defaultRestSeconds: z.number().int().nonnegative(),
  defaultRounds: z.number().int().positive(),
  soundEnabled: z.boolean(),
  hapticsEnabled: z.boolean(),
  countdownSound: z.boolean(),
  restEndingAlert: z.boolean(),
  completionSound: z.boolean(),
  hapticIntervalChanges: z.boolean(),
  hapticCountdown: z.boolean(),
  hapticComplete: z.boolean(),
  remindersEnabled: z.boolean(),
  reminderHour: z.number().int().min(0).max(23),
  reminderMinute: z.number().int().min(0).max(59),
  reducedMotion: z.boolean(),
});

const UserSchema = z.object({
  id: idSchema,
  displayName: z.string().optional(),
  onboardingCompletedAt: z.number().int().positive().optional(),
  onboardingStep: z.number().int().nonnegative().optional(),
  onboardingVersion: z.number().int().nonnegative().optional(),
  createdAt: z.number().int().positive(),
});

// EngineState schema (for live session)
const IntervalDraftSchema = z.object({
  slotId: z.string(),
  exerciseId: z.string(),
  exerciseName: z.string(),
  roundIndex: z.number().int().nonnegative(),
  exerciseIndex: z.number().int().nonnegative(),
  phase: z.enum(['WORK', 'REST', 'TRANSITION']),
  plannedSeconds: z.number().int().nonnegative(),
  actualSeconds: z.number().int().nonnegative(),
  plannedReps: z.number().int().positive().optional(),
  actualReps: z.number().int().nonnegative().optional(),
  plannedDistance: z.number().positive().optional(),
  actualDistance: z.number().positive().optional(),
  distanceUnit: z.enum(['m', 'km', 'mi']).optional(),
  trackingMode: z.enum(['TIME', 'REPS', 'DISTANCE', 'HYBRID']),
  startedAt: z.number().int().positive(),
  endedAt: z.number().int().positive(),
  outcome: z.enum(['COMPLETED', 'SKIPPED', 'PARTIAL', 'CANCELLED']),
});

const PlannedSlotSchema = z.object({
  slotId: z.string(),
  exerciseId: z.string(),
  exerciseName: z.string(),
  roundIndex: z.number().int().positive(),
  exerciseIndex: z.number().int().nonnegative(),
  phase: z.enum(['WORK', 'REST', 'TRANSITION']),
  plannedSeconds: z.number().int().positive(),
  plannedReps: z.number().int().positive().optional(),
  plannedDistance: z.number().positive().optional(),
  distanceUnit: z.enum(['m', 'km', 'mi']).optional(),
  trackingMode: z.enum(['TIME', 'REPS', 'DISTANCE', 'HYBRID']),
  nextExerciseName: z.string().optional(),
  nextExerciseId: z.string().optional(),
});

export const EngineStateSchema = z.object({
  sessionId: z.string(),
  workoutId: z.string(),
  workoutName: z.string(),
  plannedRounds: z.number().int().positive(),
  plannedExerciseCount: z.number().int().positive(),
  countdownSeconds: z.number().int().nonnegative(),
  status: z.enum(['IDLE', 'LIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']),
  phase: z.enum(['IDLE', 'COUNTDOWN', 'WORK', 'REST', 'TRANSITION', 'ROUND_COMPLETE', 'PAUSED', 'COMPLETED', 'CANCELLED']),
  pausedFrom: z.enum(['COUNTDOWN', 'WORK', 'REST', 'TRANSITION', 'ROUND_COMPLETE']).optional(),
  slotIndex: z.number().int(),
  slots: z.array(PlannedSlotSchema),
  phaseStartedAt: z.number().int().positive(),
  targetEndAt: z.number().int().positive(),
  totalPausedMs: z.number().int().nonnegative(),
  pausedAt: z.number().int().positive().optional(),
  intervals: z.array(IntervalDraftSchema),
  currentReps: z.number().int().nonnegative(),
  currentDistance: z.number().nonnegative(),
  startedAt: z.number().int().positive().optional(),
  endedAt: z.number().int().positive().optional(),
  roundCompleteSeconds: z.number().nonnegative(),
  engineSchemaVersion: z.number().int().positive().default(1),
});

export const VoltSnapshotSchema = z.object({
  version: z.number().int().positive(),
  user: UserSchema,
  settings: UserSettingsSchema,
  exercises: z.array(ExerciseSchema),
  workouts: z.array(WorkoutSchema),
  workoutExercises: z.array(WorkoutExerciseSchema),
  sessions: z.array(WorkoutSessionSchema),
  intervals: z.array(IntervalSessionSchema),
  performanceRecords: z.array(PerformanceRecordSchema),
  personalRecords: z.array(PersonalRecordSchema),
  trainingDays: z.array(TrainingDaySchema),
});

export type VoltSnapshotInput = z.input<typeof VoltSnapshotSchema>;
export type EngineStateInput = z.input<typeof EngineStateSchema>;

// Validation helpers with casting at the boundary
export function validateSnapshot(data: unknown): { success: boolean; data?: VoltSnapshotInput; errors?: z.ZodError } {
  const result = VoltSnapshotSchema.safeParse(data);
  if (result.success) return { success: true, data: result.data as VoltSnapshotInput };
  return { success: false, errors: result.error };
}

export function validateEngineState(data: unknown): { success: boolean; data?: EngineStateInput; errors?: z.ZodError } {
  const result = EngineStateSchema.safeParse(data);
  if (result.success) return { success: true, data: result.data as EngineStateInput };
  return { success: false, errors: result.error };
}

export function validatePartialSnapshot(data: unknown): VoltSnapshotInput {
  // For migration: parse what we can, use defaults for rest
  const result = VoltSnapshotSchema.partial().safeParse(data);
  if (!result.success) {
    throw new Error(`Snapshot parse failed: ${result.error.message}`);
  }
  return result.data as VoltSnapshotInput;
}