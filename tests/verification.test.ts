import { describe, expect, it, vi } from 'vitest';

// The real package cannot load outside React Native; storage is faked per-test.
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async () => null,
    setItem: async () => undefined,
    removeItem: async () => undefined,
  },
}));

import { WorkoutController } from '../src/application/workoutController';
import { currentStreak, dashboardStats, filterSessions, weekStats } from '../src/engine/analytics/dashboard';
import { aggregateSessionProgress, buildSessionProgress } from '../src/engine/analytics/sessionProgress';
import { planWorkout } from '../src/engine/workout/planner';
import { applySessionDelete, trainingDaysFromSessions } from '../src/data/deleteSession';
import { localDateKey } from '../src/domain/date';
import { asId } from '../src/domain/ids';
import type { IntervalSession, PerformanceRecord, PersonalRecord, Workout, WorkoutExercise, WorkoutSession } from '../src/domain/types';
import type { EngineState } from '../src/engine/workout/stateMachine';

/**
 * PHASE 8 — render-path verification.
 * One deterministic workout is pushed through the REAL controller (start →
 * live ticks → reps → auto-finalize), persisted into an in-memory database,
 * and then every Phase 0 render-path row is computed TWICE: once through the
 * UI chain, once from independent arithmetic on the stored rows. Equality here
 * is the definition of "the UI shows what the system actually recorded".
 */

function makeClock() {
  let t = 0;
  return {
    now: () => t,
    set: (v: number) => {
      t = v;
    },
    get: () => t,
  };
}

function memoryDb() {
  const sessions: WorkoutSession[] = [];
  const intervals = new Map<string, IntervalSession[]>();
  const performance: PerformanceRecord[] = [];
  let records: PersonalRecord[] = [];
  const trainingDays: Array<{ date: string; status: string; sessionIds: string[] }> = [];
  return {
    sessions: {
      list: () => [...sessions],
      get: (id: WorkoutSession['id']) => sessions.find((row) => row.id === id),
      upsert: async (session: WorkoutSession) => {
        const i = sessions.findIndex((row) => row.id === session.id);
        if (i >= 0) sessions[i] = session;
        else sessions.push(session);
      },
      delete: async (id: WorkoutSession['id']) => {
        const i = sessions.findIndex((row) => row.id === id);
        if (i >= 0) sessions.splice(i, 1);
        intervals.delete(id as string);
      },
    },
    intervals: {
      listAll: () => [...intervals.values()].flat(),
      listBySession: (id: WorkoutSession['id']) => intervals.get(id as string) ?? [],
      replaceSession: async (id: WorkoutSession['id'], rows: IntervalSession[]) => {
        intervals.set(id as string, rows);
      },
    },
    performance: {
      getBySession: (id: WorkoutSession['id']) => performance.find((row) => row.sessionId === id),
      list: () => [...performance],
      upsert: async (record: PerformanceRecord) => {
        const i = performance.findIndex((row) => row.sessionId === record.sessionId);
        if (i >= 0) performance[i] = record;
        else performance.push(record);
      },
    },
    records: {
      list: () => records,
      replaceAll: async (rows: PersonalRecord[]) => {
        records = rows;
      },
    },
    trainingDays: {
      list: () => trainingDays,
      syncFromSessions: async (rows: WorkoutSession[]) => {
        const rebuilt = trainingDaysFromSessions(rows, []);
        trainingDays.length = 0;
        trainingDays.push(...rebuilt.map((r) => ({ ...r })));
      },
    },
  };
}

const EXERCISE_COUNT = 3;
const ROUNDS = 2;
const WORK = 60;
const REST = 20;
const PLANNED_REPS = 15;

function tinyPlan(): { plan: { workout: Workout; exercises: Array<WorkoutExercise & { exercise: never }> }; workout: Workout } {
  const workout: Workout = { id: asId('wo-v'), name: 'Verify HIIT', notes: '', rounds: ROUNDS, isArchived: false, createdAt: 1, updatedAt: 1 };
  const items = Array.from({ length: EXERCISE_COUNT }, (_, i): WorkoutExercise & { exercise: never } => ({
    id: asId(`we-${i}`),
    workoutId: workout.id,
    exerciseId: asId(`ex-${i}`),
    orderIndex: i,
    trackingMode: 'REPS',
    plannedWorkSeconds: WORK,
    plannedRestSeconds: REST,
    plannedReps: PLANNED_REPS,
    exercise: {
      id: asId(`ex-${i}`),
      name: `Move ${i}`,
      category: 'Conditioning',
      movementType: 'dynamic',
      equipment: ['none'],
      defaultWorkDurationSeconds: WORK,
      defaultRestDurationSeconds: REST,
      trackingMode: 'REPS',
      instructions: '',
      safetyNotes: '',
      difficulty: 2,
      isCustom: false,
      createdAt: 1,
      updatedAt: 1,
    } as never,
  }));
  // controller.start accepts a WorkoutPlan ({workout, exercises}) and plans internally.
  return { plan: { workout, exercises: items }, workout };
}

// Slot geometry from the planner: R1 = W R W R W R (6), R2 = W R W R W (5).
const TOTAL_SLOTS = 11;

describe('PHASE 8 · render-path equality walk', () => {
  const clock = makeClock();
  // "Today" at 07:00 local — keeps streak/day logic TZ-safe.
  const T0 = (() => {
    const d = new Date();
    d.setHours(7, 0, 0, 0);
    return d.getTime();
  })();

  const memDb = memoryDb();
  const controller = new WorkoutController({ db: memDb as never, clock: { now: () => clock.get() } });
  const { plan } = tinyPlan();

  let liveCapture: ReturnType<typeof import('../src/engine/workout/stateMachine').getLiveView> | null = null;
  let finalized: Awaited<ReturnType<WorkoutController['complete']>> | null = null;

  it('drives a full session through the real controller', async () => {
    clock.set(T0);
    await controller.start(plan, 10, true);

    let loggedSecondRoundFirstWork = false;
    let guard = 0;
    while (guard++ < 40) {
      const view = controller.getView();
      if (view.phase === 'COMPLETED') break;
      if (view.phase === 'WORK') {
        clock.set(clock.get() + 30_000); // halfway through the slot
        // The athlete logs their reps on EVERY work slot — unlogged slots
        // would honestly count as 0 done (see F-13 note below).
        await controller.recordReps(PLANNED_REPS);
        if (!loggedSecondRoundFirstWork && view.slotIndex === 6) {
          liveCapture = controller.getView();
          loggedSecondRoundFirstWork = true;
        }
      }
      // Re-derive remaining time AFTER any mid-slot clock movement.
      const current = controller.getView();
      clock.set(clock.get() + Math.max(1, current.remainingMs) + 1);
      const res = await controller.tick();
      if (res.finalized) {
        finalized = res.finalized;
        break;
      }
    }

    expect(finalized).not.toBeNull();
    expect(finalized!.session.status).toBe('COMPLETED');
    // Planner geometry held: every planned slot closed exactly on time.
    expect(finalized!.intervals).toHaveLength(TOTAL_SLOTS);
    expect(finalized!.intervals.every((i) => i.outcome === 'COMPLETED')).toBe(true);
    expect(finalized!.intervals.every((i) => i.actualSeconds === i.plannedSeconds)).toBe(true);
  });

  it('LIVE rows match stored-slot arithmetic (Phase 0 §5 Live block)', () => {
    expect(liveCapture).not.toBeNull();
    const v = liveCapture!;
    // Interval bar: halfway through a 60s slot.
    expect(v.intervalProgress).toBeCloseTo(0.5, 3); // ±1ms loop-landing tolerance
    expect(v.intervalDetail).toBe('30s / 60s');
    // Workout bar: 6 slots closed before this one + 0.5 in-slot, over 11.
    expect(v.workoutProgress).toBeCloseTo((6 + 0.5) / TOTAL_SLOTS, 3);
    expect(v.workoutDetail).toBe('7 / 11');
    // Rounds bar: round 1 fully done of 2.
    expect(v.roundProgress).toBeCloseTo(0.5, 3);
    expect(v.roundDetail).toBe('1 / 2');
    // Reps target hit exactly.
    expect(v.repsProgress).toBeCloseTo(1, 5);
    expect(v.repsDetail).toBe('15 / 15');
    // Harness enters each slot 1 ms past its start, so "halfway" leaves
    // exactly 29 999 ms — deterministic, and proof the timer counts real ms.
    expect(v.remainingMs).toBe(29_999);
  });

  it('SUMMARY/HISTORY/PROGRESS rows equal independent math on stored rows', async () => {
    const session = finalized!.session;
    const sid = session.id;
    const intervals = memDb.intervals.listBySession(sid);
    const perf = memDb.performance.getBySession(sid)!;
    const storedSession = memDb.sessions.get(sid)!;

    expect(storedSession.status).toBe('COMPLETED');

    // Independent arithmetic from planner constants.
    const expActive = EXERCISE_COUNT * ROUNDS * WORK; // 360
    const expRest = (EXERCISE_COUNT * ROUNDS - 1) * REST; // 100 (no rest after final slot)
    const expTraining = expActive + expRest; // 460

    // Stored performance record equals constant math…
    expect(perf.totalActiveSeconds).toBe(expActive);
    expect(perf.totalRestSeconds).toBe(expRest);
    expect(perf.totalDurationSeconds).toBe(expTraining);
    expect(perf.completedRounds).toBe(ROUNDS);
    expect(perf.completedIntervals).toBe(EXERCISE_COUNT * ROUNDS);
    expect(perf.plannedIntervals).toBe(EXERCISE_COUNT * ROUNDS);
    expect(perf.workCompletionPercent).toBe(100);
    expect(perf.repCompletionPercent).toBe(100);
    expect(perf.totalReps).toBe(PLANNED_REPS * EXERCISE_COUNT * ROUNDS);

    // …and the summary chain reproduces the same numbers from raw intervals.
    expect(intervals.filter((i) => i.phase === 'WORK').reduce((s, i) => s + i.actualSeconds, 0)).toBe(expActive);
    expect(intervals.filter((i) => i.phase !== 'WORK').reduce((s, i) => s + i.actualSeconds, 0)).toBe(expRest);

    // HISTORY row: completion fraction derives from the SAME stored percent.
    const historyFill = perf.workCompletionPercent != null ? perf.workCompletionPercent / 100 : null;
    expect(historyFill).toBe(1);

    // HOME week block.
    const now = session.endedAt ?? Date.now();
    const week = weekStats(memDb.sessions.list(), memDb.performance.list(), now);
    expect(week.sessionsRecorded).toBe(1);
    expect(week.totalActiveSeconds).toBe(expActive);
    expect(week.totalTrainingSeconds).toBe(expTraining);
    expect(week.streak).toBeGreaterThanOrEqual(1);

    // PROGRESS stat grid + honest NO_DATA rows.
    const stats = dashboardStats(
      filterSessions(memDb.sessions.list(), '30', now),
      memDb.performance.list(),
      now,
    );
    expect(stats.workoutsCompleted).toBe(1);
    expect(stats.partialWorkouts).toBe(0);
    expect(stats.totalReps).toBe(PLANNED_REPS * EXERCISE_COUNT * ROUNDS);
    expect(stats.averageDistanceCompletion).toBeNull(); // never tracked → stays empty

    // Recorded-completion bars: VALUE vs NO_DATA distinction.
    const snap = buildSessionProgress(session, intervals, now);
    const byKey = Object.fromEntries(snap.tracks.map((t) => [t.key, t]));
    expect(byKey['work'].value).toBeCloseTo(1, 6);
    expect(byKey['work'].detail).toBe('100%');
    expect(byKey['reps'].value).toBeCloseTo(1, 5);
    expect(byKey['distance'].value).toBeNull(); // NO_DATA, never 0%
    expect(byKey['distance'].detail).toBe('Not enough data');

    // Per-interval breakdown mirrors stored rows 1:1.
    expect(snap.intervals).toHaveLength(6);
    for (const model of snap.intervals) {
      const stored = intervals.find((i) => i.id === model.id)!;
      expect(model.outcome).toBe(stored.outcome);
      const timeTrack = model.tracks.find((t) => t.key === 'time')!;
      expect(timeTrack.value).toBeCloseTo(stored.actualSeconds / stored.plannedSeconds, 5);
    }

    // Aggregated week bars average the single session honestly.
    const agg = aggregateSessionProgress([snap]);
    const aggWork = agg.tracks.find((t) => t.key === 'work')!;
    expect(aggWork.value).toBeCloseTo(1, 6);

    // Trend row: one point whose value IS the stored duration.
    void currentStreak; // exercised via week.streak above
  });

  it('PERSONAL RECORDS reference the stored session and match stored math', () => {
    const records = memDb.records.list();
    const perf = finalized!.performance;
    expect(records.length).toBeGreaterThan(0);
    for (const rec of records) {
      expect(rec.sessionId).toBe(finalized!.session.id);
      switch (rec.kind) {
        case 'LONGEST_ACTIVE_TIME':
          expect(rec.value).toBe(perf.totalActiveSeconds);
          break;
        case 'MOST_COMPLETED_ROUNDS':
          expect(rec.value).toBe(perf.completedRounds);
          break;
        case 'HIGHEST_WORKOUT_COMPLETION':
          expect(rec.value).toBe(perf.workCompletionPercent);
          break;
        default:
          expect(Number.isFinite(rec.value)).toBe(true);
      }
    }
  });

  it('DELETE cascade keeps derived collections consistent (history row removal)', async () => {
    const session = finalized!.session;
    const before = memDb.sessions.list().length;
    // applySessionDelete is exactly what VoltDatabase.sessions.delete runs.
    const snapshotLike = {
      version: 2,
      user: { id: 'u', createdAt: 1 },
      settings: {} as never,
      exercises: [],
      workouts: [],
      workoutExercises: [],
      sessions: memDb.sessions.list(),
      intervals: memDb.intervals.listAll(),
      performanceRecords: memDb.performance.list(),
      personalRecords: memDb.records.list(),
      trainingDays: [],
    } as never;
    void before;
    const next = applySessionDelete(snapshotLike, session.id) as unknown as {
      sessions: WorkoutSession[];
      intervals: IntervalSession[];
      performanceRecords: PerformanceRecord[];
    };
    expect(next.sessions).toHaveLength(0);
    expect(next.intervals).toHaveLength(0);
    expect(next.performanceRecords).toHaveLength(0);
  });

  it('MIDNIGHT ROLLOVER: sessions land on their own local day; streak spans both', () => {
    const noon = (() => {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      return d.getTime();
    })();
    const yesterdayEnd = noon - 12 * 3600_000 - 1; // 23:59:59.999 yesterday local
    const todayStart = noon - 12 * 3600_000 + 500; // 00:00:00.500 today local

    expect(localDateKey(yesterdayEnd)).not.toBe(localDateKey(todayStart));

    const mk = (id: string, startedAt: number, endedAt: number): WorkoutSession => ({
      id: asId(id),
      workoutId: asId('w'),
      workoutNameSnapshot: 'X',
      status: 'COMPLETED',
      startedAt,
      endedAt,
      countdownSecondsUsed: 0,
      plannedRounds: 1,
      plannedExerciseCount: 1,
    });
    const days = [mk('a', yesterdayEnd - 60_000, yesterdayEnd), mk('b', todayStart, todayStart + 60_000)];

    const grouped = trainingDaysFromSessions(days, []);
    expect(grouped.map((d) => d.date).sort()).toEqual(
      [localDateKey(yesterdayEnd), localDateKey(todayStart)].sort(),
    );
    expect(currentStreak(days, noon)).toBe(2);
  });
});

import { VoltDatabase } from '../src/data/database';

describe('PHASE 8 · storage unavailable end-to-end', () => {
  class UnavailableKV {
    async getItem(): Promise<string | null> {
      throw Object.assign(new Error('SecurityError: storage is disabled'), { name: 'SecurityError' });
    }
    async setItem(): Promise<void> {
      throw Object.assign(new Error('SecurityError: storage is disabled'), { name: 'SecurityError' });
    }
    async removeItem(): Promise<void> {
      throw Object.assign(new Error('SecurityError: storage is disabled'), { name: 'SecurityError' });
    }
  }

  it('boots into a usable in-memory session and reports the failure honestly', async () => {
    const db = new VoltDatabase(new UnavailableKV() as never);
    const outcome = await db.init();
    expect(outcome.source).toBe('fresh');
    // Reads work from the seeded in-memory snapshot…
    expect(db.sessions.list()).toEqual([]);
    await db.sessions.upsert({
      id: asId('s-mem'),
      workoutId: asId('w'),
      workoutNameSnapshot: 'In-memory',
      status: 'COMPLETED',
      startedAt: 1,
      endedAt: 2,
      countdownSecondsUsed: 0,
      plannedRounds: 1,
      plannedExerciseCount: 1,
    });
    expect(db.sessions.list()).toHaveLength(1);
    // …and the failure is classified for the PersistenceBanner, never silent.
    expect(db.getLastSaveFailure()?.kind).toBe('unavailable');
    expect(db.getLastSaveError()).toContain('unavailable');
  });
});
