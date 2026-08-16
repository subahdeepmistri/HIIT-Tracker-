import { createId, type IntervalId, type SessionId, type WorkoutId } from '../domain/ids';
import type {
  IntervalSession,
  PerformanceRecord,
  PersonalRecord,
  WorkoutPlan,
  WorkoutSession,
} from '../domain/types';
import { isValue } from '../domain/metrics';
import type { Clock } from '../engine/clock/timestampClock';
import { SystemClock } from '../engine/clock/timestampClock';
import { calculateSessionMetrics } from '../engine/calc/metrics';
import { planWorkout } from '../engine/workout/planner';
import {
  completeNow,
  createIdleState,
  deserializeEngine,
  type EngineState,

  getLiveView,
  type LiveView,
  pause,
  recordDistance,
  recordReps,
  resume,
  savePartial,
  serializeEngine,
  skip,
  startWorkout,
  tick,
} from '../engine/workout/stateMachine';
import { scoreFromMetrics } from '../engine/score/performanceScore';
import { applyPersonalRecords, detectPersonalRecords } from '../engine/records/personalRecords';
import type { VoltDatabase } from '../data/database';

export interface ControllerDeps {
  db: VoltDatabase;
  clock?: Clock;
  persistLive?: (json: string | null) => Promise<void>;
  loadLive?: () => Promise<string | null>;
}

export class WorkoutController {
  private state: EngineState = createIdleState();
  private readonly clock: Clock;
  private finalizing = false;
  private persistQueued = false;
  private persistInFlight = false;
  private lastPersistedJson: string | null = null;

  constructor(private readonly deps: ControllerDeps) {
    this.clock = deps.clock ?? new SystemClock();
  }

  getState(): EngineState {
    return this.state;
  }

  getView(): LiveView {
    return getLiveView(this.state, this.clock.now());
  }

  hydrate(state: EngineState): void {
    this.state = state;
  }

  async hydrateFromStorage(): Promise<EngineState | null> {
    const json = (await this.deps.loadLive?.()) ?? null;
    if (!json) return null;
    try {
      this.state = deserializeEngine(json);
      this.state = tick(this.state, this.clock.now());
      this.schedulePersist();
      return this.state;
    } catch {
      return null;
    }
  }

  async start(plan: WorkoutPlan, countdownSeconds: number, reducedMotion: boolean): Promise<EngineState> {
    const now = this.clock.now();
    const planned = planWorkout({
      workout: plan.workout,
      items: plan.exercises,
      countdownSeconds,
    });
    const sessionId = createId<SessionId['__brand']>() as unknown as string;
    this.state = startWorkout(planned, now, {
      sessionId,
      roundCompleteSeconds: reducedMotion ? 0 : undefined,
    });

    const session: WorkoutSession = {
      id: this.state.sessionId as SessionId,
      workoutId: plan.workout.id,
      workoutNameSnapshot: plan.workout.name,
      status: 'IN_PROGRESS',
      startedAt: now,
      countdownSecondsUsed: countdownSeconds,
      plannedRounds: planned.rounds,
      plannedExerciseCount: planned.exerciseCount,
      averageHeartRate: null,
      maximumHeartRate: null,
      heartRateSamplesJson: null,
      resumePayloadJson: serializeEngine(this.state),
    };
    await this.deps.db.sessions.upsert(session);
    this.schedulePersist();
    return this.state;
  }

  async tick(): Promise<{ state: EngineState; finalized?: FinalizeResult }> {
    const wasLive = this.state.status === 'LIVE';
    this.state = tick(this.state, this.clock.now());
    if (wasLive && this.state.status === 'COMPLETED' && !this.finalizing) {
      return { state: this.state, finalized: await this.finalizeOnce('COMPLETED') };
    }
    this.schedulePersist();
    return { state: this.state };
  }

  async checkpoint(): Promise<void> {
    this.schedulePersist();
  }

  async pause(): Promise<EngineState> {
    this.state = pause(this.state, this.clock.now());
    this.schedulePersist();
    return this.state;
  }

  async resume(): Promise<EngineState> {
    this.state = resume(this.state, this.clock.now());
    this.schedulePersist();
    return this.state;
  }

  async skip(): Promise<EngineState> {
    this.state = skip(this.state, this.clock.now());
    if (this.state.status === 'COMPLETED') {
      if (!this.finalizing) await this.finalizeOnce('COMPLETED');
      return this.state;
    }
    this.schedulePersist();
    return this.state;
  }

  async recordReps(reps: number): Promise<EngineState> {
    this.state = recordReps(this.state, reps);
    this.schedulePersist();
    return this.state;
  }

  async recordDistance(distance: number): Promise<EngineState> {
    this.state = recordDistance(this.state, distance);
    this.schedulePersist();
    return this.state;
  }

  async complete(): Promise<FinalizeResult> {
    this.state = completeNow(this.state, this.clock.now());
    return this.finalizeOnce('COMPLETED');
  }

  async savePartial(): Promise<FinalizeResult> {
    this.state = savePartial(this.state, this.clock.now());
    return this.finalizeOnce('PARTIAL');
  }

  async discard(sessionId?: SessionId): Promise<void> {
    const id = sessionId ?? (this.state.sessionId as SessionId | undefined);
    this.state = createIdleState();
    this.persistQueued = false;
    this.lastPersistedJson = null;
    await this.deps.persistLive?.(null);
    while (this.persistInFlight) {
      await Promise.resolve();
    }
    if (id) {
      if (typeof this.deps.db.sessions.delete === 'function') {
        await this.deps.db.sessions.delete(id);
      } else {
        await this.deps.db.intervals.removeBySession(id);
        await this.deps.db.sessions.remove(id);
      }
    }
  }

  private schedulePersist(): void {
    this.persistQueued = true;
    void this.flushPersistQueue();
  }

  private async flushPersistQueue(): Promise<void> {
    if (this.persistInFlight) return;
    this.persistInFlight = true;
    try {
      while (this.persistQueued) {
        this.persistQueued = false;
        await this.persistLiveOnly();
      }
    } finally {
      this.persistInFlight = false;
    }
  }

  private async persistLiveOnly(): Promise<void> {
    try {
      const liveId = this.state.sessionId;
      if (!liveId || this.state.status === 'IDLE' || this.state.status === 'CANCELLED') {
        if (this.lastPersistedJson !== null) {
          this.lastPersistedJson = null;
          await this.deps.persistLive?.(null);
        }
        return;
      }
      const json = serializeEngine(this.state);
      if (json === this.lastPersistedJson) return;
      this.lastPersistedJson = json;
      await this.deps.persistLive?.(json);
      if (!this.state.sessionId || this.state.sessionId !== liveId) {
        return;
      }
      const status = this.state.status;
      await this.flushIntervals({ notify: false });
      const sessionId = liveId as SessionId;
      const existing = this.deps.db.sessions.get(sessionId);
      await this.deps.db.sessions.upsert(
        {
          ...(existing ?? this.sessionFromEngine('IN_PROGRESS')),
          id: sessionId,
          interruptedAt: status === 'LIVE' || status === 'PAUSED' ? this.clock.now() : existing?.interruptedAt,
          resumePayloadJson: json,
          status: status === 'COMPLETED' ? (existing?.status ?? 'IN_PROGRESS') : 'IN_PROGRESS',
        },
        { notify: false },
      );
    } catch {
      // Persistence must never stop the timestamp clock.
    }
  }

  private async finalizeOnce(status: 'COMPLETED' | 'PARTIAL'): Promise<FinalizeResult> {
    if (this.finalizing) {
      throw new Error('Session finalize already in progress');
    }
    this.finalizing = true;
    try {
      return await this.finalize(status);
    } finally {
      this.finalizing = false;
    }
  }

  private async flushIntervals(options?: { notify?: boolean }): Promise<void> {
    const sessionId = this.state.sessionId as SessionId;
    if (!sessionId) return;
    const rows: IntervalSession[] = this.state.intervals.map((draft) => ({
      id: `${sessionId}:${draft.slotId}` as IntervalId,
      sessionId,
      exerciseId: draft.exerciseId as IntervalSession['exerciseId'],
      exerciseNameSnapshot: draft.exerciseName,
      roundIndex: draft.roundIndex,
      exerciseIndex: draft.exerciseIndex,
      phase: draft.phase,
      plannedSeconds: draft.plannedSeconds,
      actualSeconds: draft.actualSeconds,
      plannedReps: draft.plannedReps,
      actualReps: draft.actualReps,
      plannedDistance: draft.plannedDistance,
      actualDistance: draft.actualDistance,
      distanceUnit: draft.distanceUnit,
      startedAt: draft.startedAt,
      endedAt: draft.endedAt,
      outcome: draft.outcome,
    }));
    await this.deps.db.intervals.replaceSession(sessionId, rows, options);
  }

  private sessionFromEngine(status: WorkoutSession['status'], endedAt?: number): WorkoutSession {
    return {
      id: this.state.sessionId as SessionId,
      workoutId: this.state.workoutId as WorkoutId,
      workoutNameSnapshot: this.state.workoutName || 'Workout',
      status,
      startedAt: this.state.startedAt ?? this.clock.now(),
      endedAt,
      countdownSecondsUsed: this.state.countdownSeconds,
      plannedRounds: this.state.plannedRounds,
      plannedExerciseCount: this.state.plannedExerciseCount,
      averageHeartRate: null,
      maximumHeartRate: null,
      heartRateSamplesJson: null,
      resumePayloadJson: status === 'IN_PROGRESS' ? serializeEngine(this.state) : undefined,
    };
  }

  private async finalize(status: 'COMPLETED' | 'PARTIAL'): Promise<FinalizeResult> {
    await this.flushIntervals();
    const existing = this.state.sessionId
      ? this.deps.db.sessions.get(this.state.sessionId as SessionId)
      : undefined;
    const endedAt = this.state.endedAt ?? this.clock.now();
    const session: WorkoutSession = {
      ...(existing ?? this.sessionFromEngine('IN_PROGRESS')),
      id: (existing?.id || this.state.sessionId || createId()) as SessionId,
      status,
      endedAt,
      interruptedAt: undefined,
      resumePayloadJson: undefined,
    };
    const intervals = this.deps.db.intervals.listBySession(session.id);
    const metrics = calculateSessionMetrics(session, intervals, endedAt);
    const score = scoreFromMetrics(metrics, session.plannedRounds);
    const performance: PerformanceRecord = {
      id: createId(),
      sessionId: session.id,
      workoutId: session.workoutId,
      createdAt: endedAt,
      totalDurationSeconds: isValue(metrics.totalDurationSeconds) ? metrics.totalDurationSeconds.value : 0,
      totalActiveSeconds: isValue(metrics.totalActiveSeconds) ? metrics.totalActiveSeconds.value : 0,
      totalRestSeconds: isValue(metrics.totalRestSeconds) ? metrics.totalRestSeconds.value : 0,
      exerciseCount: isValue(metrics.exerciseCount) ? metrics.exerciseCount.value : 0,
      completedRounds: isValue(metrics.completedRounds) ? metrics.completedRounds.value : 0,
      completedIntervals: isValue(metrics.completedIntervals) ? metrics.completedIntervals.value : 0,
      plannedWorkSeconds: isValue(metrics.plannedWorkSeconds) ? metrics.plannedWorkSeconds.value : 0,
      plannedRestSeconds: intervals
        .filter((row) => row.phase === 'REST')
        .reduce((sum, row) => sum + row.plannedSeconds, 0),
      plannedReps: isValue(metrics.plannedReps) ? metrics.plannedReps.value : undefined,
      totalReps: isValue(metrics.totalReps) ? metrics.totalReps.value : undefined,
      workCompletionPercent: isValue(metrics.workCompletionPercent)
        ? metrics.workCompletionPercent.value
        : undefined,
      repCompletionPercent: isValue(metrics.repCompletionPercent)
        ? metrics.repCompletionPercent.value
        : undefined,
      intervalCompletionRate: isValue(metrics.intervalCompletionRate)
        ? metrics.intervalCompletionRate.value
        : undefined,
      workRestRatio: isValue(metrics.workRest) && Number.isFinite(metrics.workRest.value.ratio)
        ? metrics.workRest.value.ratio
        : undefined,
      performanceScore: isValue(score) ? score.value.total : undefined,
      bestIntervalId: isValue(metrics.bestInterval) ? metrics.bestInterval.value.id : undefined,
      weakestIntervalId: isValue(metrics.weakestInterval) ? metrics.weakestInterval.value.id : undefined,
    };
    await this.deps.db.sessions.upsert(session);
    await this.deps.db.performance.upsert(performance);
    await this.deps.db.trainingDays.syncFromSessions(this.deps.db.sessions.list());

    const earned = detectPersonalRecords({
      session,
      intervals,
      existing: this.deps.db.records.list(),
    });
    if (earned.length > 0) {
      await this.deps.db.records.replaceAll(applyPersonalRecords(this.deps.db.records.list(), earned));
    }

    this.state = createIdleState();
    await this.deps.persistLive?.(null);
    return { session, intervals, performance, newRecords: earned, metrics };
  }
}

export interface FinalizeResult {
  session: WorkoutSession;
  intervals: IntervalSession[];
  performance: PerformanceRecord;
  newRecords: PersonalRecord[];
  metrics: ReturnType<typeof calculateSessionMetrics>;
}
