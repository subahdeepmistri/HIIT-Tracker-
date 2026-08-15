import type { WorkoutPhase } from '../../domain/types';
import { Units } from '../../domain/units';

export interface LiveProgressInput {
  phase: WorkoutPhase;
  slotIndex: number;
  totalSlots: number;
  closedSlots: number;
  intervalProgress: number;
}

export interface LiveProgress {
  intervalProgress: number;
  workoutProgress: number;
  closedSlots: number;
  totalSlots: number;
  currentSlotNumber: number;
}

/** Countdown is preparation. Workout fill only uses planned training slots. */
export function calculateLiveProgress(input: LiveProgressInput): LiveProgress {
  const intervalProgress = clamp01(input.intervalProgress);
  const totalSlots = Math.max(0, input.totalSlots);
  const closedSlots = Math.max(0, input.closedSlots);

  if (totalSlots === 0) {
    return {
      intervalProgress,
      workoutProgress: 0,
      closedSlots,
      totalSlots: 0,
      currentSlotNumber: 0,
    };
  }

  if (input.phase === 'COMPLETED') {
    return {
      intervalProgress: 1,
      workoutProgress: 1,
      closedSlots: totalSlots,
      totalSlots,
      currentSlotNumber: totalSlots,
    };
  }

  if (input.phase === 'COUNTDOWN' || input.phase === 'IDLE' || input.phase === 'CANCELLED') {
    return {
      intervalProgress,
      workoutProgress: 0,
      closedSlots: 0,
      totalSlots,
      currentSlotNumber: 0,
    };
  }

  const inTrainingSlot =
    input.phase === 'WORK' || input.phase === 'REST' || input.phase === 'TRANSITION';
  const workoutProgress = inTrainingSlot
    ? clamp01((closedSlots + intervalProgress) / totalSlots)
    : clamp01(closedSlots / totalSlots);

  return {
    intervalProgress,
    workoutProgress,
    closedSlots,
    totalSlots,
    currentSlotNumber: Math.min(totalSlots, closedSlots + (inTrainingSlot ? 1 : 0)),
  };
}

export function formatIntervalProgressDetail(elapsedMs: number, plannedSeconds: number): string {
  const elapsed = Math.min(Math.max(0, Math.floor(elapsedMs / 1000)), Math.max(0, Math.round(plannedSeconds)));
  const planned = Math.max(0, Math.round(plannedSeconds));
  return `${elapsed}s / ${planned}s`;
}

export function formatWorkoutProgressDetail(currentSlotNumber: number, totalSlots: number): string {
  return `${currentSlotNumber} / ${totalSlots}`;
}

export function formatProgressPercent(value: number): string {
  return Units.formatPercent(clamp01(value) * 100);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
