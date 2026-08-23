import { describe, expect, it } from 'vitest';

import {
  calculateLiveProgress,
  formatIntervalProgressDetail,
  formatWorkoutProgressDetail,
  liveRoundCompletion,
  liveTargetProgress,
} from '../src/engine/workout/liveProgress';

describe('calculateLiveProgress', () => {
  it('keeps workout progress at zero during countdown', () => {
    const progress = calculateLiveProgress({
      phase: 'COUNTDOWN',
      slotIndex: 0,
      totalSlots: 30,
      closedSlots: 0,
      intervalProgress: 0.5,
    });
    expect(progress.workoutProgress).toBe(0);
    expect(progress.intervalProgress).toBe(0.5);
    expect(progress.currentSlotNumber).toBe(0);
  });

  it('includes the current training slot fraction and excludes invented fill', () => {
    const progress = calculateLiveProgress({
      phase: 'WORK',
      slotIndex: 2,
      totalSlots: 10,
      closedSlots: 2,
      intervalProgress: 0.5,
    });
    expect(progress.workoutProgress).toBe(0.25);
    expect(progress.intervalProgress).toBe(0.5);
    expect(progress.currentSlotNumber).toBe(3);
  });

  it('does not treat a 0% interval as a visible 4% fill', () => {
    const progress = calculateLiveProgress({
      phase: 'WORK',
      slotIndex: 0,
      totalSlots: 5,
      closedSlots: 0,
      intervalProgress: 0,
    });
    expect(progress.intervalProgress).toBe(0);
    expect(progress.workoutProgress).toBe(0);
  });

  it('fills the workout only after the last slot completes', () => {
    const progress = calculateLiveProgress({
      phase: 'COMPLETED',
      slotIndex: 9,
      totalSlots: 10,
      closedSlots: 10,
      intervalProgress: 1,
    });
    expect(progress.workoutProgress).toBe(1);
  });
});

describe('progress labels', () => {
  it('formats planned versus elapsed seconds without rounding the plan away', () => {
    expect(formatIntervalProgressDetail(12_400, 40)).toBe('12s / 40s');
    expect(formatWorkoutProgressDetail(8, 30)).toBe('8 / 30');
  });
});

describe('liveRoundCompletion', () => {
  it('stays empty until a planned round exists', () => {
    expect(liveRoundCompletion('WORK', 1, 0)).toEqual({ value: null, detail: 'Not enough data' });
  });

  it('counts finished rounds, not the round the athlete is currently in', () => {
    expect(liveRoundCompletion('COUNTDOWN', 1, 3)).toEqual({ value: 0, detail: '0 / 3' });
    expect(liveRoundCompletion('WORK', 1, 3)).toEqual({ value: 0, detail: '0 / 3' });
    expect(liveRoundCompletion('ROUND_COMPLETE', 2, 3)).toEqual({ value: 1 / 3, detail: '1 / 3' });
    expect(liveRoundCompletion('WORK', 2, 3)).toEqual({ value: 1 / 3, detail: '1 / 3' });
    expect(liveRoundCompletion('COMPLETED', 3, 3)).toEqual({ value: 1, detail: '3 / 3' });
  });
});

describe('liveTargetProgress', () => {
  it('treats a recorded zero as empty fill, not missing data', () => {
    expect(liveTargetProgress(0, 20)).toEqual({ value: 0, detail: '0 / 20' });
  });

  it('does not invent a bar when the plan has no target', () => {
    expect(liveTargetProgress(8, undefined)).toEqual({ value: null, detail: 'Not enough data' });
    expect(liveTargetProgress(8, 0)).toEqual({ value: null, detail: 'Not enough data' });
  });
});
