import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULTS } from '../config/defaults';
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
import { applySessionDelete } from './deleteSession';
import { applyMigrations } from './migrate';
import { DB_VERSION, type VoltSnapshot } from './schema';
import { CATALOG_EXERCISES } from './seed/exercises';
import { STARTER_WORKOUT_EXERCISES, STARTER_WORKOUTS } from './seed/workouts';
import { buildExportPayload } from './export';
import { validateSnapshot, validateEngineState, validatePartialSnapshot } from './validationSchemas';
import type { StoragePort } from './storagePort';
import type { EngineState } from '../engine/workout/stateMachine';
import type { ExportPayload } from './export';
import { VoltDatabase } from './database';
import {
  appendQuarantine,
  type QuarantineEntry,
  type QuarantineStore,
} from './quarantine';
import {
  classifyStorageError,
  safeParse,
  safeStringify,
  type StorageFailure,
} from './serialize';

const STORAGE_KEY = DEFAULTS.storageKey;
const LIVE_KEY = DEFAULTS.sessionPersistKey;
const LEGACY_LIVE_KEY = DEFAULTS.legacySessionPersistKey;

// ValidatedDatabase wraps VoltDatabase with validation and new features
// Does NOT extend VoltDatabase to avoid private field conflicts
export class ValidatedDatabase implements StoragePort {
  private inner: VoltDatabase;
  private validatedReady = false;
  private snapshotListeners = new Set<() => void>();
  private liveListeners = new Set<(state: EngineState | null) => void>();
  private sessionsListeners = new Set<() => void>();
  private intervalsListeners = new Map<string, Set<() => void>>();
  private settingsListeners = new Set<() => void>();
  private storageEventHandlers = new Map<string, Set<(newValue: string | null) => void>>();
  private quarantined: QuarantineEntry[] = [];
  private lastSaveError: string | null = null;
  private migrationRequired = false;
  private lastLiveFailure: StorageFailure | null = null;

  constructor() {
    this.inner = new VoltDatabase();
  }

  // ===== Delegate all VoltDatabase public properties =====

  get snapshot(): VoltSnapshot {
    return this.inner.snapshot;
  }

  get listeners() {
    return this.inner.listeners;
  }

  get exercises() {
    return this.inner.exercises;
  }

  get workouts() {
    return this.inner.workouts;
  }

  get sessions() {
    const self = this;
    const innerSessions = this.inner.sessions;
    return {
      list: () => innerSessions.list(),
      get: (id: SessionId) => innerSessions.get(id),
      inProgress: () => innerSessions.inProgress(),
      upsert: async (session: WorkoutSession, options?: { notify?: boolean }) => {
        await innerSessions.upsert(session, options);
        if (options?.notify !== false) self.notifySessionsListeners();
      },
      remove: async (id: SessionId) => {
        await innerSessions.remove(id);
        self.notifySessionsListeners();
      },
      delete: async (id: SessionId) => {
        await innerSessions.delete(id);
        self.notifySessionsListeners();
      },
      subscribe: (listener: () => void) => {
        self.sessionsListeners.add(listener);
        return () => self.sessionsListeners.delete(listener);
      },
    };
  }

  get intervals() {
    const self = this;
    const innerIntervals = this.inner.intervals;
    return {
      listAll: () => innerIntervals.listAll(),
      listBySession: (id: SessionId) => innerIntervals.listBySession(id),
      replaceSession: async (id: SessionId, rows: IntervalSession[], options?: { notify?: boolean }) => {
        await innerIntervals.replaceSession(id, rows, options);
        if (options?.notify !== false) self.notifyIntervalsListeners(id);
      },
      removeBySession: async (id: SessionId) => {
        await innerIntervals.removeBySession(id);
        self.notifyIntervalsListeners(id);
      },
      subscribe: (sessionId: string, listener: () => void) => {
        const set = self.intervalsListeners.get(sessionId) ?? new Set();
        set.add(listener);
        self.intervalsListeners.set(sessionId, set);
        return () => set.delete(listener);
      },
    };
  }

  get performance() {
    return this.inner.performance;
  }

  get records() {
    return this.inner.records;
  }

  get trainingDays() {
    return this.inner.trainingDays;
  }

  get settings() {
    const self = this;
    const innerSettings = this.inner.settings;
    return {
      get: () => innerSettings.get(),
      update: async (patch: Partial<UserSettings>) => {
        await innerSettings.update(patch);
        self.notifySettingsListeners();
      },
      subscribe: (listener: () => void) => {
        self.settingsListeners.add(listener);
        return () => self.settingsListeners.delete(listener);
      },
    };
  }

  get user() {
    return this.inner.user;
  }

  subscribe(listener: () => void): () => void {
    return this.inner.subscribe(listener);
  }

  // ===== Override methods with validation =====

  async init(): Promise<void> {
    if (this.validatedReady) return;
    await this.inner.init();
    this.validateLoadedSnapshot();
    this.setupStorageEventListeners();
    this.validatedReady = true;
  }

  async save(options?: { notify?: boolean }): Promise<{ success: boolean; error?: string }> {
    const validation = validateSnapshot(this.inner.snapshot);
    if (!validation.success) {
      return { success: false, error: `Snapshot validation failed: ${validation.errors?.message}` };
    }
    return this.inner.save(options);
  }

  // ===== StoragePort implementation =====

  async loadSnapshot(): Promise<VoltSnapshot | null> {
    await this.init();
    return this.inner.snapshot;
  }

  async saveSnapshot(snapshot: VoltSnapshot): Promise<{ success: boolean; error?: string }> {
    const validation = validateSnapshot(snapshot);
    if (!validation.success) {
      return { success: false, error: `Snapshot validation failed: ${validation.errors?.message}` };
    }
    this.inner.snapshot = validation.data! as VoltSnapshot;
    return this.inner.save({ notify: true });
  }

  subscribeSnapshot(listener: () => void): () => void {
    this.snapshotListeners.add(listener);
    return () => this.snapshotListeners.delete(listener);
  }

  async loadLiveSession(): Promise<EngineState | null> {
    try {
      const raw = await AsyncStorage.getItem(LIVE_KEY);
      if (!raw) return null;
      const parsed = safeParse<unknown>(raw);
      if (!parsed.ok) {
        await this.quarantineLivePayload('live-session', parsed.reason, raw);
        await AsyncStorage.removeItem(LIVE_KEY);
        return null;
      }
      const validation = validateEngineState(parsed.value);
      if (!validation.success) {
        console.warn('[ValidatedDatabase] Live session validation failed, discarding:', validation.errors?.message);
        await this.quarantineLivePayload(
          'live-session',
          validation.errors?.issues.map((i) => i.message).join('; ') ?? 'schema mismatch',
          raw,
        );
        await AsyncStorage.removeItem(LIVE_KEY);
        return null;
      }
      return validation.data as EngineState;
    } catch {
      return null;
    }
  }

  private async quarantineLivePayload(source: string, error: string, data: unknown): Promise<void> {
    const store: QuarantineStore = AsyncStorage as unknown as QuarantineStore;
    await appendQuarantine(store, DEFAULTS.quarantineKey, [
      { collection: source, index: 0, error, data, quarantinedAt: Date.now() },
    ]);
  }

  async saveLiveSession(state: EngineState | null): Promise<{ success: boolean; error?: string }> {
    if (state === null) {
      try {
        await AsyncStorage.removeItem(LIVE_KEY);
      } catch (error) {
        const failure = classifyStorageError(error);
        this.lastLiveFailure = failure;
        return { success: false, error: `Failed to clear live session (${failure.kind}): ${failure.message}` };
      }
      this.lastLiveFailure = null;
      this.notifyLiveListeners(null);
      return { success: true };
    }
    const validation = validateEngineState(state);
    if (!validation.success) {
      return { success: false, error: `Live session validation failed: ${validation.errors?.message}` };
    }
    const serialized = safeStringify(validation.data);
    if (!serialized.ok) {
      this.lastLiveFailure = { kind: 'serialize', message: serialized.reason };
      return { success: false, error: `Live session serialisation failed: ${serialized.reason}` };
    }
    try {
      await AsyncStorage.setItem(LIVE_KEY, serialized.json);
      this.lastLiveFailure = null;
      this.notifyLiveListeners(validation.data as EngineState);
      return { success: true };
    } catch (error) {
      const failure = classifyStorageError(error);
      this.lastLiveFailure = failure;
      return { success: false, error: `Failed to save live session (${failure.kind}): ${failure.message}` };
    }
  }

  subscribeLiveSession(listener: (state: EngineState | null) => void): () => void {
    this.liveListeners.add(listener);
    return () => this.liveListeners.delete(listener);
  }

  onStorageEvent(key: string, handler: (newValue: string | null) => void): () => void {
    const handlers = this.storageEventHandlers.get(key) ?? new Set();
    handlers.add(handler);
    this.storageEventHandlers.set(key, handlers);
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) this.storageEventHandlers.delete(key);
    };
  }

  async exportAll(): Promise<ExportPayload> {
    await this.init();
    const s = this.inner.snapshot;
    return buildExportPayload(
      s.sessions,
      s.intervals,
      s.performanceRecords,
      s.personalRecords,
      s.trainingDays,
      s.workouts,
      s.workoutExercises,
      s.exercises,
      s.user,
      s.settings,
    );
  }

  async importAll(payload: ExportPayload): Promise<{ success: boolean; error?: string }> {
    try {
      const validation = validateSnapshot(payload);
      if (!validation.success) {
        return { success: false, error: `Import validation failed: ${validation.errors?.message}` };
      }
      this.inner.snapshot = validation.data! as VoltSnapshot;
      await this.inner.save({ notify: true });
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown import error';
      return { success: false, error: message };
    }
  }

  // ===== Private methods =====

  private validateLoadedSnapshot(): void {
    const s = this.inner.snapshot;
    const validation = validateSnapshot(s);
    if (!validation.success) {
      console.warn('[ValidatedDatabase] Snapshot validation failed, quarantining bad rows:', validation.errors?.message);
    }
  }

  private setupStorageEventListeners(): void {
    if (typeof window === 'undefined') return;
    const handleStorage = (event: StorageEvent) => {
      if (!event.key) return;
      const handlers = this.storageEventHandlers.get(event.key);
      if (handlers) {
        handlers.forEach((h) => h(event.newValue));
      }
      // Apply the external write into the live instance. init() would no-op
      // here (ready flag) and leave this tab stale — that was finding F-02.
      if (event.key === STORAGE_KEY || event.key === DEFAULTS.legacyStorageKey) {
        void this.inner.reloadFromStorage(event.newValue).then(() => {
          this.notifySnapshotListeners();
          this.notifySessionsListeners();
        });
      }
      if (event.key === LIVE_KEY || event.key === LEGACY_LIVE_KEY) {
        this.loadLiveSession().then((state) => this.notifyLiveListeners(state));
      }
    };
    window.addEventListener('storage', handleStorage);

    // Web tab close / background: land any queued snapshot writes.
    const flushOnHide = () => {
      void this.inner.flushWrites();
    };
    window.addEventListener('pagehide', flushOnHide);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushOnHide();
    });
  }

  // NOTE (F-A fix): every collection mutator persists synchronously through
  // VoltDatabase's ordered write queue, so a debounced re-flush here only
  // duplicated identical writes. Granular notifications below are the sole job.

  private notifySnapshotListeners(): void {
    this.snapshotListeners.forEach((l) => l());
  }

  private notifyLiveListeners(state: EngineState | null): void {
    this.liveListeners.forEach((l) => l(state));
  }

  private notifySessionsListeners(): void {
    this.sessionsListeners.forEach((l) => l());
  }

  private notifyIntervalsListeners(sessionId: string): void {
    this.intervalsListeners.get(sessionId)?.forEach((l) => l());
  }

  private notifySettingsListeners(): void {
    this.settingsListeners.forEach((l) => l());
  }

  // ===== Delegated methods =====

  getLastSaveError(): string | null {
    return this.inner.getLastSaveError();
  }

  clearLastSaveError(): void {
    this.inner.clearLastSaveError();
  }

  isMigrationRequired(): boolean {
    return this.migrationRequired;
  }

  /**
   * Honest persistence status for the UI. 'ok' means the last write landed;
   * anything else carries a plain-language kind the interface must surface
   * rather than hide (quota / unavailable / serialize).
   */
  getStorageStatus(): { ok: boolean; failure: StorageFailure | null; source: 'snapshot' | 'live' } {
    const snapshotFailure = this.inner.getLastSaveFailure();
    if (snapshotFailure) return { ok: false, failure: snapshotFailure, source: 'snapshot' };
    if (this.lastLiveFailure) return { ok: false, failure: this.lastLiveFailure, source: 'live' };
    return { ok: true, failure: null, source: 'snapshot' };
  }

  getQuarantinedRows(): QuarantineEntry[] {
    return [...this.quarantined, ...this.inner.getQuarantinedRows()];
  }

  validateIntegrity(): { valid: boolean; issues: string[] } {
    return this.inner.validateIntegrity();
  }

  async repair(): Promise<{ success: boolean; fixed: string[] }> {
    return this.inner.repair();
  }

  async deleteWorkoutData(): Promise<void> {
    await this.inner.deleteWorkoutData();
    await this.saveLiveSession(null);
    this.notifySnapshotListeners();
    this.notifySessionsListeners();
    this.notifySettingsListeners();
  }
}

// Backward-compatible singleton
let validatedDbInstance: ValidatedDatabase | null = null;

export function getValidatedDatabase(): ValidatedDatabase {
  if (!validatedDbInstance) {
    validatedDbInstance = new ValidatedDatabase();
  }
  return validatedDbInstance;
}

export function createValidatedDatabase(): ValidatedDatabase {
  return new ValidatedDatabase();
}

export { localDateKey } from '../domain/date';
export { VoltDatabase } from './database';