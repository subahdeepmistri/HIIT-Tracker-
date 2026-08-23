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

export function liveRoundCompletion(
  phase: WorkoutPhase,
  roundIndex: number,
  totalRounds: number,
): { value: number | null; detail: string } {
  if (!Number.isFinite(totalRounds) || totalRounds <= 0) {
    return { value: null, detail: 'Not enough data' };
  }
  if (phase === 'COMPLETED') {
    return { value: 1, detail: `${totalRounds} / ${totalRounds}` };
  }
  if (phase === 'COUNTDOWN' || phase === 'IDLE' || phase === 'CANCELLED') {
    return { value: 0, detail: `0 / ${totalRounds}` };
  }
  const safeRound = Number.isFinite(roundIndex) ? Math.max(1, roundIndex) : 1;
  const completed = Math.max(0, Math.min(totalRounds, safeRound - 1));
  return { value: completed / totalRounds, detail: `${completed} / ${totalRounds}` };
}

export function liveTargetProgress(
  current: number,
  planned: number | undefined,
): { value: number | null; detail: string } {
  if (planned == null || !Number.isFinite(planned) || planned <= 0) {
    return { value: null, detail: 'Not enough data' };
  }
  if (!Number.isFinite(current) || current < 0) {
    return { value: null, detail: 'Not enough data' };
  }
  const shown = Number.isInteger(current) && Number.isInteger(planned)
    ? `${current} / ${planned}`
    : `${trimLiveNumber(current)} / ${trimLiveNumber(planned)}`;
  return { value: current / planned, detail: shown };
}

function trimLiveNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
