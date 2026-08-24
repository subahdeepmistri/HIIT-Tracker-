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
import {
  appendQuarantine,
  sanitizeSnapshotRows,
  type QuarantineEntry,
} from './quarantine';
import { classifyStorageError, safeParse, safeStringify, type StorageFailure } from './serialize';
import { DB_VERSION, type VoltSnapshot } from './schema';
import { CATALOG_EXERCISES } from './seed/exercises';
import { STARTER_WORKOUT_EXERCISES, STARTER_WORKOUTS } from './seed/workouts';
import type { RepoContext } from './repositories/context';
import { createExerciseRepo, type ExerciseRepo } from './repositories/exerciseRepo';
import { createWorkoutRepo, type WorkoutRepo } from './repositories/workoutRepo';
import { createSessionRepo, type SessionRepo } from './repositories/sessionRepo';
import { createIntervalRepo, type IntervalRepo } from './repositories/intervalRepo';
import {
  createPerformanceRepo,
  type PerformanceRepo,
} from './repositories/performanceRepo';
import { createRecordsRepo, type RecordsRepo } from './repositories/recordsRepo';
import {
  createTrainingDayRepo,
  type TrainingDayRepo,
} from './repositories/trainingDayRepo';
import {
  createSettingsRepo,
  createUserRepo,
  type SettingsRepo,
  type UserRepo,
} from './repositories/settingsRepo';

const STORAGE_KEY = DEFAULTS.storageKey;
const LEGACY_STORAGE_KEY = DEFAULTS.legacyStorageKey;
const BACKUP_KEY = `${STORAGE_KEY}:pre-migration-backup`;
export const QUARANTINE_KEY = DEFAULTS.quarantineKey;

/** Minimal async KV contract — AsyncStorage today, a future API client later. */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

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

export interface InitOutcome {
  source: 'fresh' | 'loaded' | 'recovered' | 'corrupt';
  quarantined: number;
}

/**
 * Owns the snapshot lifecycle and the single write queue; collection CRUD
 * lives in repositories composed below. The public surface is identical to
 * the pre-split class — callers cannot tell the difference.
 */
export class VoltDatabase {
  snapshot: VoltSnapshot = emptySnapshot();
  private ready = false;
  private listeners_ = new Set<() => void>();
  private kv: KeyValueStore;

  /** Ordered single-flight write chain — setItem calls can never interleave or reorder. */
  private writeQueue: Promise<void> = Promise.resolve();

  private lastSaveError: string | null = null;
  private lastSaveFailure: StorageFailure | null = null;
  private lastInitOutcome: InitOutcome = { source: 'fresh', quarantined: 0 };
  private quarantinedRows: QuarantineEntry[] = [];

  private readonly ctx: RepoContext;

  readonly exercises: ExerciseRepo;
  readonly workouts: WorkoutRepo;
  readonly sessions: SessionRepo;
  readonly intervals: IntervalRepo;
  readonly performance: PerformanceRepo;
  readonly records: RecordsRepo;
  readonly trainingDays: TrainingDayRepo;
  readonly settings: SettingsRepo;
  readonly user: UserRepo;

  constructor(kv?: KeyValueStore) {
    this.kv = kv ?? (AsyncStorage as unknown as KeyValueStore);
    const self: VoltDatabase = this;
    this.ctx = {
      snapshot: () => self.snapshot,
      setSnapshot: (next) => {
        self.snapshot = next;
      },
      save: (options) => self.save(options),
    };
    this.exercises = createExerciseRepo(this.ctx);
    this.workouts = createWorkoutRepo(this.ctx);
    this.sessions = createSessionRepo(this.ctx);
    this.intervals = createIntervalRepo(this.ctx);
    this.performance = createPerformanceRepo(this.ctx);
    this.records = createRecordsRepo(this.ctx);
    this.trainingDays = createTrainingDayRepo(this.ctx);
    this.settings = createSettingsRepo(this.ctx);
    this.user = createUserRepo(this.ctx);
  }

  get listeners(): Set<() => void> {
    return this.listeners_;
  }

  getLastInitOutcome(): InitOutcome {
    return this.lastInitOutcome;
  }

  getQuarantinedRows(): QuarantineEntry[] {
    return [...this.quarantinedRows];
  }

  subscribe(listener: () => void): () => void {
    this.listeners_.add(listener);
    return () => this.listeners_.delete(listener);
  }

  private async readRawSnapshot(): Promise<{ raw: string | null }> {
    let raw: string | null = null;
    try {
      raw = await this.kv.getItem(STORAGE_KEY);
    } catch {
      raw = null;
    }
    if (!raw) {
      try {
        raw = await this.kv.getItem(LEGACY_STORAGE_KEY);
      } catch {
        raw = null;
      }
    }
    return { raw };
  }

  /**
   * One-time bootstrap. Loads, validates per-row (quarantining bad rows),
   * migrates forward with a best-effort pre-migration backup, and seeds an
   * explicit fresh install when nothing readable exists.
   */
  async init(): Promise<InitOutcome> {
    if (this.ready) return this.lastInitOutcome;
    const outcome: InitOutcome = { source: 'fresh', quarantined: 0 };

    const { raw } = await this.readRawSnapshot();

    if (raw == null) {
      // Explicit empty state: fresh install is intended behaviour, not an error.
      this.snapshot = emptySnapshot();
      await this.save({ notify: false });
      this.ready = true;
      this.lastInitOutcome = outcome;
      return outcome;
    }

    const parsed = safeParse<unknown>(raw);
    if (!parsed.ok) {
      // Corrupt payload: start clean but keep the bytes for recovery/inspection.
      outcome.source = 'corrupt';
      this.snapshot = emptySnapshot();
      await this.persistRecoveryArtifact(`${STORAGE_KEY}:corrupt-backup`, raw);
      await this.save({ notify: false });
      this.ready = true;
      this.lastInitOutcome = outcome;
      return outcome;
    }

    const sanitized = sanitizeSnapshotRows(parsed.value);
    outcome.quarantined = sanitized.quarantined.length;
    outcome.source = sanitized.version == null ? 'recovered' : 'loaded';

    const incomingVersion =
      sanitized.version != null && Number.isFinite(sanitized.version) ? sanitized.version : 1;

    const base = emptySnapshot();
    const merged: VoltSnapshot = {
      version: incomingVersion as VoltSnapshot['version'],
      user: this.mergeUser(base.user, parsed.value),
      settings: { ...defaultSettings(), ...this.readSettingish(parsed.value) },
      exercises: sanitized.collections.exercises.length > 0 ? sanitized.collections.exercises : base.exercises,
      workouts: sanitized.collections.workouts.length > 0 ? sanitized.collections.workouts : base.workouts,
      workoutExercises:
        sanitized.collections.workoutExercises.length > 0
          ? sanitized.collections.workoutExercises
          : base.workoutExercises,
      sessions: sanitized.collections.sessions,
      intervals: sanitized.collections.intervals,
      performanceRecords: sanitized.collections.performanceRecords,
      personalRecords: sanitized.collections.personalRecords,
      trainingDays: sanitized.collections.trainingDays,
    };

    // Best-effort backup of the exact pre-migration bytes, so a migration bug
    // can never destroy the only copy of the user's history.
    if (incomingVersion < DB_VERSION) {
      await this.persistRecoveryArtifact(BACKUP_KEY, raw);
    }

    this.snapshot = applyMigrations(merged);

    if (sanitized.quarantined.length > 0) {
      this.quarantinedRows = sanitized.quarantined;
      void appendQuarantine(this.kv, QUARANTINE_KEY, sanitized.quarantined);
    }

    await this.save({ notify: false });
    this.ready = true;
    this.lastInitOutcome = outcome;
    return outcome;
  }

  private mergeUser(fallbackBase: VoltSnapshot['user'], parsed: unknown): VoltSnapshot['user'] {
    const candidate =
      parsed != null && typeof parsed === 'object' ? (parsed as Record<string, unknown>).user : undefined;
    if (candidate == null || typeof candidate !== 'object') return fallbackBase;
    const record = candidate as Record<string, unknown>;
    if (typeof record.id !== 'string' || record.id.length === 0) return fallbackBase;
    return {
      ...fallbackBase,
      ...(candidate as Partial<VoltSnapshot['user']>),
      // Boundary cast: the schema layer guarantees this is a non-empty string;
      // the brand exists only at compile time.
      id: record.id as VoltSnapshot['user']['id'],
    };
  }

  private readSettingish(parsed: unknown): Partial<UserSettings> | undefined {
    const candidate =
      parsed != null && typeof parsed === 'object' ? (parsed as Record<string, unknown>).settings : undefined;
    if (candidate == null || typeof candidate !== 'object' || Array.isArray(candidate)) return undefined;
    return candidate as Partial<UserSettings>;
  }

  private async persistRecoveryArtifact(key: string, raw: string): Promise<void> {
    try {
      await this.kv.setItem(key, raw);
    } catch {
      // Recovery artifacts are best-effort by design.
    }
  }

  /**
   * Cross-tab path: apply a freshly-read storage value into the live instance
   * without the init()-early-return trap and without echoing a write back
   * unless migration changed the version.
   */
  async reloadFromStorage(rawOverride?: string | null): Promise<'applied' | 'ignored' | 'fresh'> {
    const { raw } =
      rawOverride !== undefined ? { raw: rawOverride } : await this.readRawSnapshot();

    if (raw == null) {
      // Another context cleared storage. Mirror the clear honestly.
      this.snapshot = emptySnapshot();
      this.notify();
      return 'fresh';
    }

    const parsed = safeParse<unknown>(raw);
    if (!parsed.ok) return 'ignored'; // Keep current in-memory state; ignore corrupt external event.

    const sanitized = sanitizeSnapshotRows(parsed.value);
    const incomingVersion =
      sanitized.version != null && Number.isFinite(sanitized.version) ? sanitized.version : 1;
    const base = emptySnapshot();
    const merged: VoltSnapshot = {
      version: incomingVersion as VoltSnapshot['version'],
      user: this.mergeUser(base.user, parsed.value),
      settings: { ...defaultSettings(), ...this.readSettingish(parsed.value) },
      exercises: sanitized.collections.exercises.length > 0 ? sanitized.collections.exercises : base.exercises,
      workouts: sanitized.collections.workouts.length > 0 ? sanitized.collections.workouts : base.workouts,
      workoutExercises:
        sanitized.collections.workoutExercises.length > 0
          ? sanitized.collections.workoutExercises
          : base.workoutExercises,
      sessions: sanitized.collections.sessions,
      intervals: sanitized.collections.intervals,
      performanceRecords: sanitized.collections.performanceRecords,
      personalRecords: sanitized.collections.personalRecords,
      trainingDays: sanitized.collections.trainingDays,
    };

    if (incomingVersion < DB_VERSION) await this.persistRecoveryArtifact(BACKUP_KEY, raw);
    const migrated = applyMigrations(merged);

    if (sanitized.quarantined.length > 0) {
      this.quarantinedRows = sanitized.quarantined;
      void appendQuarantine(this.kv, QUARANTINE_KEY, sanitized.quarantined);
    }

    const serializedNow = safeStringify(migrated);
    const serializedStored = safeStringify(parsed.value);
    this.snapshot = migrated;
    this.notify();
    if (
      !serializedNow.ok ||
      !serializedStored.ok ||
      serializedNow.json !== serializedStored.json
    ) {
      await this.performSave({ notify: false });
    }
    return 'applied';
  }

  async save(options?: { notify?: boolean }): Promise<{ success: boolean; error?: string }> {
    const run = this.writeQueue.then(() => this.performSave(options));
    this.writeQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  /** Flush any pending queued write; resolves once every requested save has landed. */
  async flushWrites(): Promise<void> {
    await this.writeQueue;
  }

  private notify(): void {
    this.listeners_.forEach((listener) => listener());
  }

  private async performSave(options?: { notify?: boolean }): Promise<{ success: boolean; error?: string }> {
    const serialized = safeStringify(this.snapshot);
    if (!serialized.ok) {
      // Never write data that would be unreadable or silently mangled later.
      this.lastSaveFailure = { kind: 'serialize', message: serialized.reason };
      this.lastSaveError = `Failed to serialise snapshot: ${serialized.reason}`;
      if (options?.notify !== false) this.notify();
      return { success: false, error: this.lastSaveError };
    }
    try {
      await this.kv.setItem(STORAGE_KEY, serialized.json);
      this.lastSaveError = null;
      this.lastSaveFailure = null;
      if (options?.notify !== false) this.notify();
      return { success: true };
    } catch (error) {
      const failure = classifyStorageError(error);
      this.lastSaveFailure = failure;
      this.lastSaveError = `Failed to save (${failure.kind}): ${failure.message}`;
      if (options?.notify !== false) this.notify();
      return { success: false, error: this.lastSaveError };
    }
  }

  getLastSaveError(): string | null {
    return this.lastSaveError;
  }

  getLastSaveFailure(): StorageFailure | null {
    return this.lastSaveFailure;
  }

  clearLastSaveError(): void {
    this.lastSaveError = null;
    this.lastSaveFailure = null;
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
      this.kv.removeItem(DEFAULTS.sessionPersistKey).catch(() => undefined),
      this.kv.removeItem(DEFAULTS.legacySessionPersistKey).catch(() => undefined),
    ]);
    await this.save();
  }

  validateIntegrity(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const { snapshot } = this;

    if (!snapshot.user?.id) issues.push('Missing user ID');
    if (!snapshot.settings) issues.push('Missing settings');
    if (!Array.isArray(snapshot.exercises)) issues.push('Exercises array is missing');
    if (!Array.isArray(snapshot.workouts)) issues.push('Workouts array is missing');
    if (!Array.isArray(snapshot.workoutExercises)) issues.push('WorkoutExercises array is missing');
    if (!Array.isArray(snapshot.sessions)) issues.push('Sessions array is missing');
    if (!Array.isArray(snapshot.intervals)) issues.push('Intervals array is missing');
    if (!Array.isArray(snapshot.performanceRecords)) issues.push('PerformanceRecords array is missing');
    if (!Array.isArray(snapshot.personalRecords)) issues.push('PersonalRecords array is missing');
    if (!Array.isArray(snapshot.trainingDays)) issues.push('TrainingDays array is missing');

    const exerciseIds = new Set(snapshot.exercises.map((e) => e.id));
    for (const we of snapshot.workoutExercises) {
      if (!exerciseIds.has(we.exerciseId)) {
        issues.push(`WorkoutExercise references missing exercise: ${we.exerciseId}`);
      }
    }

    const sessionIds = new Set(snapshot.sessions.map((s) => s.id));
    for (const interval of snapshot.intervals) {
      if (!sessionIds.has(interval.sessionId)) {
        issues.push(`Interval references missing session: ${interval.sessionId}`);
      }
      if (!exerciseIds.has(interval.exerciseId)) {
        issues.push(`Interval references missing exercise: ${interval.exerciseId}`);
      }
    }

    for (const perf of snapshot.performanceRecords) {
      if (!sessionIds.has(perf.sessionId)) {
        issues.push(`PerformanceRecord references missing session: ${perf.sessionId}`);
      }
    }

    for (const record of snapshot.personalRecords) {
      if (!sessionIds.has(record.sessionId)) {
        issues.push(`PersonalRecord references missing session: ${record.sessionId}`);
      }
      if (record.exerciseId && !exerciseIds.has(record.exerciseId)) {
        issues.push(`PersonalRecord references missing exercise: ${record.exerciseId}`);
      }
    }

    return { valid: issues.length === 0, issues };
  }

  async repair(): Promise<{ success: boolean; fixed: string[] }> {
    const fixed: string[] = [];
    const { snapshot } = this;
    let changed = false;

    const exerciseIds = new Set(snapshot.exercises.map((e) => e.id));
    const validWorkoutExercises = snapshot.workoutExercises.filter((we) => exerciseIds.has(we.exerciseId));
    if (validWorkoutExercises.length !== snapshot.workoutExercises.length) {
      snapshot.workoutExercises = validWorkoutExercises;
      fixed.push(`Removed ${snapshot.workoutExercises.length - validWorkoutExercises.length} orphaned WorkoutExercises`);
      changed = true;
    }

    const sessionIds = new Set(snapshot.sessions.map((s) => s.id));
    const validIntervals = snapshot.intervals.filter((i) => sessionIds.has(i.sessionId) && exerciseIds.has(i.exerciseId));
    if (validIntervals.length !== snapshot.intervals.length) {
      snapshot.intervals = validIntervals;
      fixed.push(`Removed ${snapshot.intervals.length - validIntervals.length} orphaned Intervals`);
      changed = true;
    }

    const validPerformance = snapshot.performanceRecords.filter((p) => sessionIds.has(p.sessionId));
    if (validPerformance.length !== snapshot.performanceRecords.length) {
      snapshot.performanceRecords = validPerformance;
      fixed.push(`Removed ${snapshot.performanceRecords.length - validPerformance.length} orphaned PerformanceRecords`);
      changed = true;
    }

    const validRecords = snapshot.personalRecords.filter((r) => sessionIds.has(r.sessionId) && (!r.exerciseId || exerciseIds.has(r.exerciseId)));
    if (validRecords.length !== snapshot.personalRecords.length) {
      snapshot.personalRecords = validRecords;
      fixed.push(`Removed ${snapshot.personalRecords.length - validRecords.length} orphaned PersonalRecords`);
      changed = true;
    }

    if (changed) {
      await this.save();
    }
    return { success: true, fixed };
  }
}

export { localDateKey } from '../domain/date';

export const db = new VoltDatabase();
