import { describe, expect, it } from 'vitest';

import {
  calculateLiveProgress,
  formatIntervalProgressDetail,
  formatWorkoutProgressDetail,
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
