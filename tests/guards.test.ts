import { describe, expect, it } from 'vitest';

import { completionPercent } from '../src/engine/calc/completion';
import { workRestRatio } from '../src/engine/calc/ratio';
import {
  calculateLiveProgress,
  liveRoundCompletion,
  liveTargetProgress,
} from '../src/engine/workout/liveProgress';
import { dashboardStats } from '../src/engine/analytics/dashboard';
import { getLiveView, type EngineState } from '../src/engine/workout/stateMachine';
import type { PerformanceRecord, WorkoutSession } from '../src/domain/types';
import { asId } from '../src/domain/ids';
import { isValue } from '../src/domain/metrics';

/**
 * F-07 / F-08 evidence: hostile arithmetic — NaN, Infinity, zeros and
 * negatives entering any displayed-value path — must degrade to honest
 * "Not enough data" states or clamped ranges. Never NaN in the DOM.
 */

describe('completionPercent guards', () => {
  it('refuses zero plans instead of dividing by zero', () => {
    const m = completionPercent(0, 10);
    expect(isValue(m)).toBe(false);
  });
  it('refuses negatives', () => {
    expect(isValue(completionPercent(-5, 10))).toBe(false);
    expect(isValue(completionPercent(10, -5))).toBe(false);
  });
  it('refuses non-finite inputs', () => {
    expect(isValue(completionPercent(Number.NaN, 10))).toBe(false);
    expect(isValue(completionPercent(100, Number.POSITIVE_INFINITY))).toBe(false);
  });
  it('computes honest percentages otherwise, including over-completion', () => {
    expect(completionPercent(50, 25)).toEqual({ kind: 'value', value: 50 });
    // Over-completion is real data: allowed, UI clamps the bar separately.
    expect(completionPercent(20, 30)).toEqual({ kind: 'value', value: 150 });
  });
});

describe('workRestRatio guards', () => {
  it('no work and no rest is insufficient, never 0:0', () => {
    expect(isValue(workRestRatio(0, 0))).toBe(false);
  });
  it('continuous work gets an explicit label, not Infinity rendered', () => {
    const m = workRestRatio(120, 0);
    expect(isValue(m)).toBe(true);
    if (isValue(m)) expect(m.value.display).toBe('Continuous');
  });
  it('non-finite inputs are refused', () => {
    expect(isValue(workRestRatio(Number.NaN, 5))).toBe(false);
    expect(isValue(workRestRatio(5, Number.NaN))).toBe(false);
  });
});

describe('live progress guards', () => {
  it('liveTargetProgress: no plan or bad current → Not enough data', () => {
    expect(liveTargetProgress(5, undefined).value).toBeNull();
    expect(liveTargetProgress(5, 0).value).toBeNull();
    expect(liveTargetProgress(5, Number.NaN).value).toBeNull();
    expect(liveTargetProgress(Number.NaN, 10).value).toBeNull();
    expect(liveTargetProgress(-1, 10).value).toBeNull();
  });
  it('liveRoundCompletion: zero/negative rounds → Not enough data', () => {
    expect(liveRoundCompletion('WORK', 1, 0).value).toBeNull();
    expect(liveRoundCompletion('WORK', 1, -3).value).toBeNull();
    expect(liveRoundCompletion('WORK', 1, Number.NaN).value).toBeNull();
  });
  it('calculateLiveProgress clamps hostile intervalProgress into [0,1]', () => {
    const base = { phase: 'WORK' as const, slotIndex: 0, totalSlots: 4, closedSlots: 1 };
    for (const hostile of [Number.NaN, Number.POSITIVE_INFINITY, -2, 7]) {
      const r = calculateLiveProgress({ ...base, intervalProgress: hostile });
      expect(r.intervalProgress).toBeGreaterThanOrEqual(0);
      expect(r.intervalProgress).toBeLessThanOrEqual(1);
      expect(r.workoutProgress).toBeGreaterThanOrEqual(0);
      expect(r.workoutProgress).toBeLessThanOrEqual(1);
      expect(Number.isFinite(r.workoutProgress)).toBe(true);
    }
  });
});

describe('dashboard guards', () => {
  const session: WorkoutSession = {
    id: asId('s1'),
    workoutId: asId('w1'),
    workoutNameSnapshot: 'X',
    status: 'COMPLETED',
    startedAt: 0,
    endedAt: 1000,
    countdownSecondsUsed: 0,
    plannedRounds: 2,
    plannedExerciseCount: 1,
  };
  const perfWithNaN = (over: Partial<PerformanceRecord>): PerformanceRecord => ({
    id: asId('p'),
    sessionId: asId('s1'),
    workoutId: asId('w1'),
    createdAt: 1000,
    totalDurationSeconds: 10,
    totalActiveSeconds: 8,
    totalRestSeconds: 2,
    exerciseCount: 1,
    completedRounds: 1,
    completedIntervals: 1,
    plannedWorkSeconds: 8,
    plannedRestSeconds: 2,
    ...over,
  });

  it('NaN percent fields are excluded from averages, never rendered', () => {
    const stats = dashboardStats(
      [session],
      [perfWithNaN({ workCompletionPercent: Number.NaN, performanceScore: Number.NaN })],
      Date.now(),
    );
    expect(stats.averageCompletion).toBeNull();
    expect(stats.averageScore).toBeNull();
  });

  it('zero-duration sessions do not poison average duration', () => {
    const stats = dashboardStats([session], [perfWithNaN({})], Date.now());
    expect(stats.averageDurationSeconds).toBeCloseTo(10, 5);
  });
});

describe('getLiveView with a zero-length slot', () => {
  it('produces finite progress and detail strings, never NaN text', () => {
    const state: EngineState = {
      sessionId: '',
      workoutId: '',
      workoutName: '',
      plannedRounds: 1,
      plannedExerciseCount: 1,
      countdownSeconds: 0,
      status: 'LIVE',
      phase: 'WORK',
      slotIndex: 0,
      slots: [
        {
          slotId: 'r1-e0-work',
          roundIndex: 1,
          exerciseIndex: 0,
          phase: 'WORK',
          exerciseId: 'ex',
          exerciseName: 'Zero',
          trackingMode: 'TIME',
          plannedSeconds: 0,
          isLastInRound: true,
          isLastInWorkout: false,
        },
      ],
      phaseStartedAt: 1000,
      targetEndAt: 1000,
      totalPausedMs: 0,
      intervals: [],
      currentReps: 0,
      currentDistance: 0,
      startedAt: 1000,
      roundCompleteSeconds: 0,
    };
    const view = getLiveView(state, 1500);
    expect(Number.isFinite(view.progress)).toBe(true);
    expect(Number.isFinite(view.intervalProgress)).toBe(true);
    expect(Number.isFinite(view.workoutProgress)).toBe(true);
    expect(view.intervalDetail).toMatch(/^0s \/ 0s$/);
    expect(view.intervalDetail).not.toContain('NaN');
  });
});
