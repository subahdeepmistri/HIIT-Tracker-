import { createId, type IntervalId, type SessionId } from '../domain/ids';
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
  finish,
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
  private tickLock = false;
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
      await this.persist();
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
    await this.persist();
    return this.state;
  }

  async tick(): Promise<{ state: EngineState; finalized?: FinalizeResult }> {
    if (this.tickLock) return { state: this.state };
    this.tickLock = true;
    try {
      const wasLive = this.state.status === 'LIVE';
      const before = this.state.intervals.length;
      const previousStatus = this.state.status;
      this.state = tick(this.state, this.clock.now());
      const phaseChanged = this.state.intervals.length !== before || this.state.status !== previousStatus;
      if (this.state.intervals.length !== before) {
        await this.flushIntervals();
      }
      if (phaseChanged) {
        await this.persist();
      }
      if (wasLive && this.state.status === 'COMPLETED') {
        const finalized = await this.finalize('COMPLETED');
        return { state: this.state, finalized };
      }
      return { state: this.state };
    } finally {
      this.tickLock = false;
    }
  }

  async checkpoint(): Promise<void> {
    await this.persist(true);
  }

  async pause(): Promise<EngineState> {
    this.state = pause(this.state, this.clock.now());
    await this.persist();
    return this.state;
  }

  async resume(): Promise<EngineState> {
    this.state = resume(this.state, this.clock.now());
    await this.persist();
    return this.state;
  }

  async skip(): Promise<EngineState> {
    this.state = skip(this.state, this.clock.now());
    await this.flushIntervals();
    await this.persist();
    if (this.state.status === 'COMPLETED') await this.finalize('COMPLETED');
    return this.state;
  }

  async recordReps(reps: number): Promise<EngineState> {
    this.state = recordReps(this.state, reps);
    await this.persist();
    return this.state;
  }

  async recordDistance(distance: number): Promise<EngineState> {
    this.state = recordDistance(this.state, distance);
    await this.persist();
    return this.state;
  }

  async complete(): Promise<FinalizeResult> {
    this.state = completeNow(this.state, this.clock.now());
    return this.finalize('COMPLETED');
  }

  async savePartial(): Promise<FinalizeResult> {
    this.state = savePartial(this.state, this.clock.now());
    return this.finalize('PARTIAL');
  }

  async discard(): Promise<void> {
    const sessionId = this.state.sessionId as SessionId;
    this.state = finish(this.state, this.clock.now(), 'discard');
    if (sessionId) {
      await this.deps.db.sessions.remove(sessionId);
      await this.deps.db.intervals.removeBySession(sessionId);
    }
    this.state = createIdleState();
    await this.deps.persistLive?.(null);
  }

  private async persist(force = false): Promise<void> {
    if (!this.state.sessionId || this.state.status === 'IDLE') {
      if (this.lastPersistedJson !== null || force) {
        this.lastPersistedJson = null;
        await this.deps.persistLive?.(null);
      }
      return;
    }
    const json = serializeEngine(this.state);
    if (!force && json === this.lastPersistedJson) return;
    this.lastPersistedJson = json;
    await this.deps.persistLive?.(json);
    const existing = this.deps.db.sessions.get(this.state.sessionId as SessionId);
    if (existing) {
      await this.deps.db.sessions.upsert({
        ...existing,
        interruptedAt: this.state.status === 'LIVE' || this.state.status === 'PAUSED' ? this.clock.now() : existing.interruptedAt,
        resumePayloadJson: json,
        status:
          this.state.status === 'CANCELLED'
            ? 'CANCELLED'
            : this.state.status === 'COMPLETED'
              ? existing.status
              : 'IN_PROGRESS',
      });
    }
  }

  private async flushIntervals(): Promise<void> {
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
    await this.deps.db.intervals.replaceSession(sessionId, rows);
  }

  private async finalize(status: 'COMPLETED' | 'PARTIAL'): Promise<FinalizeResult> {
    await this.flushIntervals();
    const sessionId = this.state.sessionId as SessionId;
    const existing = this.deps.db.sessions.get(sessionId);
    if (!existing) {
      this.state = createIdleState();
      await this.deps.persistLive?.(null);
      throw new Error('Session missing');
    }
    const endedAt = this.state.endedAt ?? this.clock.now();
    const session: WorkoutSession = {
      ...existing,
      status,
      endedAt,
      interruptedAt: undefined,
      resumePayloadJson: undefined,
    };
    const intervals = this.deps.db.intervals.listBySession(sessionId);
    const metrics = calculateSessionMetrics(session, intervals, endedAt);
    const score = scoreFromMetrics(metrics, session.plannedRounds);
    const performance: PerformanceRecord = {
      id: createId(),
      sessionId,
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
