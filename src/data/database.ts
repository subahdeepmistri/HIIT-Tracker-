import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULTS } from '../config/defaults';
import { AUDIO_DEFAULTS } from '../config/defaults';
import { localDateKey } from '../domain/date';
import { createId, type SessionId, type WorkoutId } from '../domain/ids';
import type {
  Exercise,
  IntervalSession,
  PerformanceRecord,
  PersonalRecord,
  TrainingDay,
  TrainingDayStatus,
  User,
  UserSettings,
  Workout,
  WorkoutExercise,
  WorkoutPlan,
  WorkoutSession,
} from '../domain/types';
import { applyMigrations } from './migrate';
import { DB_VERSION, type VoltSnapshot } from './schema';
import { CATALOG_EXERCISES } from './seed/exercises';
import { STARTER_WORKOUT_EXERCISES, STARTER_WORKOUTS } from './seed/workouts';

const STORAGE_KEY = DEFAULTS.storageKey;

export function defaultSettings(): UserSettings {
  return {
    theme: 'dark',
    distanceUnit: 'km',
    countdownSeconds: DEFAULTS.countdownSeconds,
    defaultWorkSeconds: DEFAULTS.workSeconds,
    defaultRestSeconds: DEFAULTS.restSeconds,
    defaultRounds: DEFAULTS.rounds,
    ...AUDIO_DEFAULTS,
    remindersEnabled: false,
    reminderHour: 7,
    reminderMinute: 0,
    reducedMotion: false,
  };
}

export function emptySnapshot(): VoltSnapshot {
  const now = Date.now();
  return {
    version: DB_VERSION,
    user: { id: createId(), createdAt: now },
    settings: defaultSettings(),
    exercises: CATALOG_EXERCISES,
    workouts: STARTER_WORKOUTS,
    workoutExercises: STARTER_WORKOUT_EXERCISES,
    sessions: [],
    intervals: [],
    performanceRecords: [],
    personalRecords: [],
    trainingDays: [],
  };
}

export class VoltDatabase {
  snapshot: VoltSnapshot = emptySnapshot();
  private ready = false;
  private listeners = new Set<() => void>();

  readonly exercises = {
    list: () => this.snapshot.exercises.filter((row) => true),
    get: (id: Exercise['id']) => this.snapshot.exercises.find((row) => row.id === id),
    upsert: async (exercise: Exercise) => {
      const index = this.snapshot.exercises.findIndex((row) => row.id === exercise.id);
      if (index >= 0) this.snapshot.exercises[index] = exercise;
      else this.snapshot.exercises.push(exercise);
      await this.save();
    },
    search: (query: string, category?: Exercise['category']) => {
      const q = query.trim().toLowerCase();
      return this.snapshot.exercises.filter((row) => {
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

  readonly workouts = {
    list: () => this.snapshot.workouts.filter((row) => !row.isArchived),
    get: (id: WorkoutId) => this.snapshot.workouts.find((row) => row.id === id),
    plan: (id: WorkoutId): WorkoutPlan | null => {
      const workout = this.snapshot.workouts.find((row) => row.id === id);
      if (!workout) return null;
      const items = this.snapshot.workoutExercises
        .filter((row) => row.workoutId === id)
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((row) => {
          const exercise = this.snapshot.exercises.find((item) => item.id === row.exerciseId);
          if (!exercise) return null;
          return { ...row, exercise };
        })
        .filter((row): row is WorkoutExercise & { exercise: Exercise } => row != null);
      return { workout, exercises: items };
    },
    upsert: async (workout: Workout, items: WorkoutExercise[]) => {
      const index = this.snapshot.workouts.findIndex((row) => row.id === workout.id);
      if (index >= 0) this.snapshot.workouts[index] = workout;
      else this.snapshot.workouts.push(workout);
      this.snapshot.workoutExercises = [
        ...this.snapshot.workoutExercises.filter((row) => row.workoutId !== workout.id),
        ...items,
      ];
      await this.save();
    },
    archive: async (id: WorkoutId) => {
      const workout = this.snapshot.workouts.find((row) => row.id === id);
      if (!workout) return;
      workout.isArchived = true;
      workout.updatedAt = Date.now();
      await this.save();
    },
  };

  readonly sessions = {
    list: () => [...this.snapshot.sessions].sort((a, b) => (b.endedAt ?? b.startedAt) - (a.endedAt ?? a.startedAt)),
    get: (id: SessionId) => this.snapshot.sessions.find((row) => row.id === id),
    inProgress: () => this.snapshot.sessions.find((row) => row.status === 'IN_PROGRESS'),
    upsert: async (session: WorkoutSession, options?: { notify?: boolean }) => {
      const index = this.snapshot.sessions.findIndex((row) => row.id === session.id);
      if (index >= 0) this.snapshot.sessions[index] = session;
      else this.snapshot.sessions.push(session);
      await this.save(options);
    },
    remove: async (id: SessionId) => {
      this.snapshot.sessions = this.snapshot.sessions.filter((row) => row.id !== id);
      await this.save();
    },
  };

  readonly intervals = {
    listBySession: (id: SessionId) =>
      this.snapshot.intervals
        .filter((row) => row.sessionId === id)
        .sort((a, b) => a.startedAt - b.startedAt),
    replaceSession: async (id: SessionId, rows: IntervalSession[], options?: { notify?: boolean }) => {
      this.snapshot.intervals = [...this.snapshot.intervals.filter((row) => row.sessionId !== id), ...rows];
      await this.save(options);
    },
    removeBySession: async (id: SessionId) => {
      this.snapshot.intervals = this.snapshot.intervals.filter((row) => row.sessionId !== id);
      await this.save();
    },
  };

  readonly performance = {
    getBySession: (id: SessionId) => this.snapshot.performanceRecords.find((row) => row.sessionId === id),
    list: () => [...this.snapshot.performanceRecords].sort((a, b) => b.createdAt - a.createdAt),
    upsert: async (record: PerformanceRecord) => {
      const index = this.snapshot.performanceRecords.findIndex((row) => row.id === record.id);
      if (index >= 0) this.snapshot.performanceRecords[index] = record;
      else this.snapshot.performanceRecords.push(record);
      await this.save();
    },
  };

  readonly records = {
    list: () => this.snapshot.personalRecords,
    replaceAll: async (rows: PersonalRecord[]) => {
      this.snapshot.personalRecords = rows;
      await this.save();
    },
  };

  readonly trainingDays = {
    list: () => this.snapshot.trainingDays,
    markRest: async (date: string) => {
      const existing = this.snapshot.trainingDays.find((row) => row.date === date);
      if (existing) existing.status = 'REST';
      else this.snapshot.trainingDays.push({ date, status: 'REST', sessionIds: [] });
      await this.save();
    },
    syncFromSessions: async (sessions: WorkoutSession[]) => {
      const byDate = new Map<string, WorkoutSession[]>();
      for (const session of sessions) {
        if (session.status === 'CANCELLED' || session.status === 'IN_PROGRESS') continue;
        const date = localDateKey(session.endedAt ?? session.startedAt);
        const list = byDate.get(date) ?? [];
        list.push(session);
        byDate.set(date, list);
      }
      const restDays = this.snapshot.trainingDays.filter((row) => row.status === 'REST' && !byDate.has(row.date));
      const next: TrainingDay[] = restDays;
      for (const [date, list] of byDate) {
        const status: TrainingDayStatus = list.some((row) => row.status === 'COMPLETED')
          ? 'COMPLETED'
          : 'PARTIAL';
        next.push({ date, status, sessionIds: list.map((row) => row.id) });
      }
      this.snapshot.trainingDays = next;
      await this.save();
    },
  };

  readonly settings = {
    get: () => this.snapshot.settings,
    update: async (patch: Partial<UserSettings>) => {
      this.snapshot.settings = { ...this.snapshot.settings, ...patch };
      await this.save();
    },
  };

  readonly user = {
    get: () => this.snapshot.user,
    update: async (patch: Partial<User>) => {
      this.snapshot.user = { ...this.snapshot.user, ...patch };
      await this.save();
    },
  };

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async init(): Promise<void> {
    if (this.ready) return;
    try {
      const raw =
        (await AsyncStorage.getItem(STORAGE_KEY)) ??
        (await AsyncStorage.getItem(DEFAULTS.legacyStorageKey));
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<VoltSnapshot> & { version?: number };
        const incomingVersion = parsed.version ?? 1;
        const merged: VoltSnapshot = {
          ...emptySnapshot(),
          ...parsed,
          version: incomingVersion,
          settings: { ...defaultSettings(), ...parsed.settings },
          user: { ...emptySnapshot().user, ...parsed.user },
        };
        this.snapshot = applyMigrations(merged);
        const needsWrite =
          this.snapshot.version !== incomingVersion || !(await AsyncStorage.getItem(STORAGE_KEY));
        if (needsWrite) {
          await this.save();
        }
      } else {
        this.snapshot = emptySnapshot();
        await this.save();
      }
    } catch {
      this.snapshot = emptySnapshot();
    }
    this.ready = true;
  }

  async save(options?: { notify?: boolean }): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.snapshot));
    } catch {
      // Quota / private mode must never freeze a live workout.
    }
    if (options?.notify !== false) {
      this.listeners.forEach((listener) => listener());
    }
  }

  async deleteWorkoutData(): Promise<void> {
    this.snapshot.sessions = [];
    this.snapshot.intervals = [];
    this.snapshot.performanceRecords = [];
    this.snapshot.personalRecords = [];
    this.snapshot.trainingDays = [];
    this.snapshot.exercises = this.snapshot.exercises.filter((row) => !row.isCustom);
    this.snapshot.workouts = STARTER_WORKOUTS.map((row) => ({ ...row }));
    this.snapshot.workoutExercises = STARTER_WORKOUT_EXERCISES.map((row) => ({ ...row }));
    await Promise.all([
      AsyncStorage.removeItem(DEFAULTS.sessionPersistKey),
      AsyncStorage.removeItem(DEFAULTS.legacySessionPersistKey),
    ]);
    await this.save();
  }
}

export { localDateKey } from '../domain/date';

export const db = new VoltDatabase();
