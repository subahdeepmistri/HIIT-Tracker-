import { afterAll, describe, expect, it, vi } from 'vitest';

const storageState = vi.hoisted(() => ({
  setItemImpl: async (_k: string, _v: string) => {},
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async () => null,
    setItem: (k: string, v: string) => storageState.setItemImpl(k, v),
    removeItem: async () => undefined,
  },
}));

import { performance } from 'node:perf_hooks';
import { readFileSync, writeFileSync } from 'node:fs';

import { dashboardStats, filterSessions, trendPointSets, trendPoints, type RangeKey } from '../src/engine/analytics/dashboard';
import { aggregateSessionProgress, buildSessionProgress } from '../src/engine/analytics/sessionProgress';
import { planWorkout } from '../src/engine/workout/planner';
import { serializeEngine, startWorkout, tick, skip, type EngineState } from '../src/engine/workout/stateMachine';
import { getValidatedDatabase } from '../src/data/validatedDatabase';
import type { IntervalSession, PerformanceRecord, Workout, WorkoutExercise, WorkoutSession } from '../src/domain/types';
import { asId } from '../src/domain/ids';

/**
 * Phase 7 measurement harness. Prints a timing table; assertions only guard
 * correctness so numbers stay comparable across optimisations.
 */

function time(label: string, iterations: number, fn: () => void): number {
  fn(); // warmup
  const t0 = performance.now();
  for (let i = 0; i < iterations; i += 1) fn();
  const ms = (performance.now() - t0) / iterations;
  record(label, ms);
  return ms;
}

const RESULTS: Record<string, number | string> = {};
const RESULT_FILE = 'tests/perf-results.json';

function record(label: string, value: number | string): void {
  RESULTS[label] = typeof value === 'number' ? Number(value.toFixed(3)) : value;
}

afterAll(() => {
  writeFileSync(RESULT_FILE, JSON.stringify(RESULTS, null, 2));
});

function loadPrevious(): Record<string, number | string> {
  try {
    return JSON.parse(readFileSync(RESULT_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function synthCorpus(sessions: number, intervalsPerSession: number) {
  const now = Date.now();
  const sRows: WorkoutSession[] = [];
  const iRows: IntervalSession[] = [];
  const pRows: PerformanceRecord[] = [];
  for (let s = 0; s < sessions; s += 1) {
    const id = asId(`s-${s}`) as WorkoutSession['id'];
    const startedAt = now - (s + 1) * 86_400_000;
    const endedAt = startedAt + 30 * 60_000;
    sRows.push({
      id,
      workoutId: asId('w1'),
      workoutNameSnapshot: 'Perf HIIT',
      status: s % 7 === 0 ? 'PARTIAL' : 'COMPLETED',
      startedAt,
      endedAt,
      countdownSecondsUsed: 3,
      plannedRounds: 4,
      plannedExerciseCount: 6,
      averageHeartRate: null,
      maximumHeartRate: null,
      heartRateSamplesJson: null,
    });
    for (let k = 0; k < intervalsPerSession; k += 1) {
      iRows.push({
        id: asId(`${id}:i-${k}`),
        sessionId: id,
        exerciseId: asId(`ex-${k % 6}`),
        exerciseNameSnapshot: `Move ${k % 6}`,
        roundIndex: Math.floor(k / 12) + 1,
        exerciseIndex: k % 6,
        phase: k % 2 === 0 ? 'WORK' : 'REST',
        plannedSeconds: 40,
        actualSeconds: k % 9 === 0 ? 12 : 40,
        startedAt: startedAt + k * 60_000,
        endedAt: startedAt + k * 60_000 + 40_000,
        outcome: k % 9 === 0 ? 'PARTIAL' : 'COMPLETED',
      });
    }
    pRows.push({
      id: asId(`p-${s}`),
      sessionId: id,
      workoutId: asId('w1'),
      createdAt: endedAt,
      totalDurationSeconds: 1800,
      totalActiveSeconds: 1200,
      totalRestSeconds: 600,
      exerciseCount: 6,
      completedRounds: 4,
      completedIntervals: 24,
      plannedWorkSeconds: 1440,
      plannedRestSeconds: 360,
      plannedRounds: 4,
      plannedIntervals: 24,
      workCompletionPercent: 83,
      repCompletionPercent: undefined,
      intervalCompletionRate: 95,
      roundCompletionPercent: 100,
      performanceScore: 88,
      workRestRatio: 2,
      totalReps: undefined,
    });
  }
  return { sRows, iRows, pRows, now };
}

describe('PERF baseline report', () => {
  it('measures the Progress-screen pipeline', () => {
    const { sRows, iRows, pRows, now } = synthCorpus(400, 24);
    const range: RangeKey = '90';

    const msFilter = time('filterSessions', 200, () => {
      filterSessions(sRows, range, now);
    });

    // OLD: quadratic .some() join from app/(tabs)/progress.tsx
    const msJoinQuadratic = time('P1 perf-join OLD (.some)', 50, () => {
      const selected = filterSessions(sRows, range, now);
      pRows.filter((row) => selected.some((s) => s.id === row.sessionId));
    });
    // NEW: O(p) map index (dashboard.indexPerformance)
    const msJoinMap = time('P1 perf-join NEW (Map)', 50, () => {
      const selected = filterSessions(sRows, range, now);
      const ids = new Set(selected.map((s) => s.id));
      pRows.filter((row) => ids.has(row.sessionId));
    });
    record('P1 speedup', Number((msJoinQuadratic / Math.max(msJoinMap, 0.0001)).toFixed(2)));

    // OLD screen pattern: O(total intervals) scan per session.
    const msAnalyticsOld = time('P2 analytics OLD (per-session scan)', 20, () => {
      const selected = filterSessions(sRows, range, now);
      aggregateSessionProgress(
        selected.map((s) =>
          buildSessionProgress(s, iRows.filter((r) => r.sessionId === s.id), s.endedAt ?? now),
        ),
      );
    });

    // NEW screen pattern: one grouping pass, then O(1) lookups.
    const groupIntervals = () => {
      const m = new Map<string, IntervalSession[]>();
      for (const row of iRows) {
        const list = m.get(row.sessionId);
        if (list) list.push(row);
        else m.set(row.sessionId, [row]);
      }
      return m;
    };
    const msAnalyticsNew = time('P2 analytics NEW (grouped map)', 20, () => {
      const idx = groupIntervals();
      const selected = filterSessions(sRows, range, now);
      aggregateSessionProgress(
        selected.map((s) => buildSessionProgress(s, idx.get(s.id) ?? [], s.endedAt ?? now)),
      );
    });
    record('P2 speedup', Number((msAnalyticsOld / msAnalyticsNew).toFixed(2)));

    const fields = ['duration', 'completion', 'active', 'rest', 'reps', 'score', 'distance'] as const;
    // OLD: seven independent trendPoints calls (each refilters + rejoins).
    const t0 = performance.now();
    for (let i = 0; i < 20; i += 1) {
      const selected = filterSessions(sRows, range, now);
      const perf = pRows.filter((r) => selected.some((s) => s.id === r.sessionId));
      for (const field of fields) {
        trendPoints(sRows, perf, range, now, field);
      }
    }
    const msTrendOld = (performance.now() - t0) / 20;
    record('P3 trends OLD (x7 calls)', msTrendOld);
    // NEW: one filtered+sorted pass producing all seven series.
    const t1 = performance.now();
    for (let i = 0; i < 20; i += 1) {
      trendPointSets(sRows, pRows, range, now, fields);
    }
    const msTrendNew = (performance.now() - t1) / 20;
    record('P3 trends NEW (single pass)', msTrendNew);
    record('P3 speedup', Number((msTrendOld / Math.max(msTrendNew, 0.0001)).toFixed(2)));

    expect(msFilter).toBeLessThan(50);
    expect(msJoinQuadratic).toBeLessThan(200);
    expect(msAnalyticsOld).toBeLessThan(500);
    expect(msTrendOld).toBeLessThan(500);
  });

  it('measures dashboardStats at scale', () => {
    const { sRows, iRows, pRows, now } = synthCorpus(1000, 24);
    const ms = time('dashboardStats@1000', 50, () => {
      dashboardStats(sRows, pRows, now);
    });
    void iRows;
    expect(ms).toBeLessThan(50);
  });

  it('measures per-tick live serialisation cost late in a workout', () => {
    const workout: Workout = { id: asId('w'), name: 'Live', notes: '', rounds: 25, isArchived: false, createdAt: 1, updatedAt: 1 };
    const plan = planWorkout({
      workout,
      items: Array.from({ length: 6 }, (_, i) => ({
        id: asId(`we-${i}`),
        workoutId: workout.id,
        exerciseId: asId(`ex-${i}`),
        orderIndex: i,
        trackingMode: 'REPS' as const,
        plannedWorkSeconds: 40,
        plannedRestSeconds: 20,
        plannedReps: 15,
        exercise: {
          id: asId(`ex-${i}`),
          name: `Move ${i}`,
          category: 'Conditioning',
          movementType: 'dynamic',
          equipment: ['none'],
          defaultWorkDurationSeconds: 40,
          defaultRestDurationSeconds: 20,
          trackingMode: 'REPS',
          instructions: '',
          safetyNotes: '',
          difficulty: 2,
          isCustom: false,
          createdAt: 1,
          updatedAt: 1,
        },
      })),
      countdownSeconds: 3,
    });
    let st: EngineState = startWorkout(plan, 0, { roundCompleteSeconds: 0 });
    // Fast-forward deep into the workout: many closed interval drafts.
    let t = 0;
    for (let i = 0; i < 140; i += 1) {
      t += 41_000;
      st = tick(st, t);
      if (st.phase === 'WORK' && st.slotIndex >= 0 && !st.slots[st.slotIndex].plannedReps) continue;
    }
    const deepState = skip(st, t);

    const bytes = serializeEngine(deepState).length;
    record('engine-state payload KB @late-workout', (bytes/1024).toFixed(1));
    const ms = time('serializeEngine(tick-path)', 500, () => {
      serializeEngine(deepState);
    });
    void loadPrevious();
    expect(bytes).toBeGreaterThan(0);
    expect(ms).toBeLessThan(5);
  });

  it('counts storage writes produced by 40 collection mutations', async () => {
    const writes: number[] = [];
    const original = storageState.setItemImpl;
    storageState.setItemImpl = async (_k: string, v: string) => {
      writes.push(v.length);
    };
    const db = getValidatedDatabase();
    await db.init();
    writes.length = 0;

    for (let i = 0; i < 40; i += 1) {
      await db.settings.update({ countdownSeconds: 3 + (i % 5) });
    }

    record('setItem calls / 40 mutations', writes.length);
    record('bytes written / 40 mutations', writes.reduce((a, b) => a + b, 0));
    storageState.setItemImpl = original;
    expect(writes.length).toBeGreaterThan(0);
  });
});
