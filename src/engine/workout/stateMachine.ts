import { DEFAULTS } from '../../config/defaults';
import { createId } from '../../domain/ids';
import type { IntervalOutcome, IntervalPhase, TrackingMode, WorkoutPhase } from '../../domain/types';
import { remainingMs } from '../clock/timestampClock';
import type { PlannedSlot, PlannedWorkout } from './planner';

export interface IntervalDraft {
  slotId: string;
  exerciseId: string;
  exerciseName: string;
  roundIndex: number;
  exerciseIndex: number;
  phase: IntervalPhase;
  plannedSeconds: number;
  actualSeconds: number;
  plannedReps?: number;
  actualReps?: number;
  plannedDistance?: number;
  actualDistance?: number;
  distanceUnit?: PlannedSlot['distanceUnit'];
  trackingMode: TrackingMode;
  startedAt: number;
  endedAt: number;
  outcome: IntervalOutcome;
}

export interface EngineState {
  sessionId: string;
  workoutId: string;
  workoutName: string;
  plannedRounds: number;
  plannedExerciseCount: number;
  countdownSeconds: number;
  status: 'IDLE' | 'LIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  phase: WorkoutPhase;
  pausedFrom?: Exclude<WorkoutPhase, 'PAUSED' | 'IDLE'>;
  slotIndex: number;
  slots: PlannedSlot[];
  phaseStartedAt: number;
  targetEndAt: number;
  totalPausedMs: number;
  pausedAt?: number;
  intervals: IntervalDraft[];
  currentReps: number;
  currentDistance: number;
  startedAt?: number;
  endedAt?: number;
  roundCompleteSeconds: number;
}

export interface LiveView {
  phase: WorkoutPhase;
  remainingMs: number;
  elapsedMs: number;
  progress: number;
  currentExerciseName: string | null;
  nextExerciseName: string | null;
  roundIndex: number;
  totalRounds: number;
  plannedSeconds: number;
  trackingMode: TrackingMode | null;
  currentReps: number;
  plannedReps?: number;
  currentDistance: number;
  plannedDistance?: number;
  targetLabel: string | null;
  slotIndex: number;
  totalSlots: number;
}

export function createIdleState(): EngineState {
  return {
    sessionId: '',
    workoutId: '',
    workoutName: '',
    plannedRounds: 0,
    plannedExerciseCount: 0,
    countdownSeconds: DEFAULTS.countdownSeconds,
    status: 'IDLE',
    phase: 'IDLE',
    slotIndex: -1,
    slots: [],
    phaseStartedAt: 0,
    targetEndAt: 0,
    totalPausedMs: 0,
    intervals: [],
    currentReps: 0,
    currentDistance: 0,
    roundCompleteSeconds: DEFAULTS.roundCompleteSeconds,
  };
}

export function startWorkout(
  plan: PlannedWorkout,
  now: number,
  options?: { sessionId?: string; roundCompleteSeconds?: number },
): EngineState {
  if (plan.slots.length === 0) {
    throw new Error('Workout has no intervals');
  }
  const countdownSeconds = Math.max(0, plan.countdownSeconds);
  const sessionId = options?.sessionId ?? createId();
  const countdownMs = countdownSeconds * 1000;
  const phase: WorkoutPhase = countdownMs > 0 ? 'COUNTDOWN' : 'WORK';
  const slotIndex = countdownMs > 0 ? -1 : 0;
  const first = plan.slots[0];

  return {
    sessionId,
    workoutId: plan.workoutId,
    workoutName: plan.workoutName,
    plannedRounds: plan.rounds,
    plannedExerciseCount: plan.exerciseCount,
    countdownSeconds,
    status: 'LIVE',
    phase,
    slotIndex,
    slots: plan.slots,
    phaseStartedAt: now,
    targetEndAt: now + (countdownMs > 0 ? countdownMs : first.plannedSeconds * 1000),
    totalPausedMs: 0,
    intervals: [],
    currentReps: 0,
    currentDistance: 0,
    startedAt: now,
    roundCompleteSeconds: options?.roundCompleteSeconds ?? DEFAULTS.roundCompleteSeconds,
  };
}

export function tick(state: EngineState, now: number): EngineState {
  if (state.status !== 'LIVE') return state;
  if (now < state.targetEndAt) return state;
  return advancePastDue(state, now);
}

export function pause(state: EngineState, now: number): EngineState {
  if (state.status !== 'LIVE') return state;
  if (state.phase === 'COMPLETED' || state.phase === 'CANCELLED') return state;
  return {
    ...state,
    status: 'PAUSED',
    pausedFrom: state.phase as Exclude<WorkoutPhase, 'PAUSED' | 'IDLE'>,
    phase: 'PAUSED',
    pausedAt: now,
  };
}

export function resume(state: EngineState, now: number): EngineState {
  if (state.status !== 'PAUSED' || state.pausedAt == null || !state.pausedFrom) return state;
  const remaining = Math.max(0, state.targetEndAt - state.pausedAt);
  const pauseMs = Math.max(0, now - state.pausedAt);
  const plannedMs = plannedMsForPhase(state);
  return {
    ...state,
    status: 'LIVE',
    phase: state.pausedFrom,
    pausedFrom: undefined,
    pausedAt: undefined,
    totalPausedMs: state.totalPausedMs + pauseMs,
    phaseStartedAt: now - (plannedMs - remaining),
    targetEndAt: now + remaining,
  };
}

export function skip(state: EngineState, now: number): EngineState {
  const live = state.status === 'PAUSED' ? resume(state, now) : state;
  if (live.status !== 'LIVE') return live;
  if (live.phase === 'COUNTDOWN') {
    return enterSlot(live, 0, now);
  }
  if (live.phase === 'ROUND_COMPLETE') {
    return enterSlot(live, live.slotIndex, now);
  }
  const closed = closeCurrentSlot(live, now, 'SKIPPED');
  return moveNext(closed, now);
}

export function recordReps(state: EngineState, reps: number): EngineState {
  if (reps < 0 || !Number.isFinite(reps)) return state;
  return { ...state, currentReps: Math.floor(reps) };
}

export function recordDistance(state: EngineState, distance: number): EngineState {
  if (distance < 0 || !Number.isFinite(distance)) return state;
  return { ...state, currentDistance: distance };
}

export function finish(state: EngineState, now: number, mode: 'complete' | 'partial' | 'discard'): EngineState {
  if (mode === 'discard') {
    return {
      ...state,
      status: 'CANCELLED',
      phase: 'CANCELLED',
      endedAt: now,
    };
  }

  let next = state.status === 'PAUSED' ? resume(state, now) : state;
  if (isActiveInterval(next.phase) && next.status === 'LIVE') {
    next = closeCurrentSlot(next, now, mode === 'partial' ? 'PARTIAL' : 'PARTIAL');
  }

  return {
    ...next,
    status: mode === 'complete' && allWorkComplete(next) ? 'COMPLETED' : mode === 'complete' ? 'COMPLETED' : 'COMPLETED',
    phase: mode === 'partial' ? 'COMPLETED' : 'COMPLETED',
    endedAt: now,
    currentReps: 0,
    currentDistance: 0,
  };
}

export function savePartial(state: EngineState, now: number): EngineState {
  let next = state.status === 'PAUSED' ? resume(state, now) : state;
  if (isActiveInterval(next.phase)) {
    next = closeCurrentSlot(next, now, 'PARTIAL');
  }
  return {
    ...next,
    status: 'COMPLETED',
    phase: 'COMPLETED',
    endedAt: now,
  };
}

export function completeNow(state: EngineState, now: number): EngineState {
  let next = state.status === 'PAUSED' ? resume(state, now) : state;
  if (isActiveInterval(next.phase)) {
    next = closeCurrentSlot(next, now, 'PARTIAL');
  }
  return {
    ...next,
    status: 'COMPLETED',
    phase: 'COMPLETED',
    endedAt: now,
  };
}

export function getLiveView(state: EngineState, now: number): LiveView {
  const reference = state.status === 'PAUSED' && state.pausedAt != null ? state.pausedAt : now;
  const remain = remainingMs(state.targetEndAt, reference);
  const plannedMs = plannedMsForPhase(state);
  const elapsed = Math.max(0, plannedMs - remain);
  const slot = currentSlot(state);
  const progress = plannedMs > 0 ? Math.min(1, elapsed / plannedMs) : 0;

  return {
    phase: state.phase,
    remainingMs: remain,
    elapsedMs: elapsed,
    progress,
    currentExerciseName: slot?.exerciseName ?? state.slots[0]?.exerciseName ?? null,
    nextExerciseName: nextExerciseName(state),
    roundIndex: slot?.roundIndex ?? 1,
    totalRounds: state.plannedRounds,
    plannedSeconds: plannedMs / 1000,
    trackingMode: slot?.trackingMode ?? null,
    currentReps: state.currentReps,
    plannedReps: slot?.plannedReps,
    currentDistance: state.currentDistance,
    plannedDistance: slot?.plannedDistance,
    targetLabel: targetLabel(slot, state.phase),
    slotIndex: state.slotIndex,
    totalSlots: state.slots.length,
  };
}

function advancePastDue(state: EngineState, now: number): EngineState {
  let current = state;
  let guard = 0;
  while (current.status === 'LIVE' && now >= current.targetEndAt && guard < 500) {
    guard += 1;
    if (current.phase === 'COUNTDOWN') {
      current = enterSlot(current, 0, current.targetEndAt);
      continue;
    }
    if (current.phase === 'ROUND_COMPLETE') {
      current = enterSlot(current, current.slotIndex, current.targetEndAt);
      continue;
    }
    current = closeCurrentSlot(current, current.targetEndAt, 'COMPLETED');
    current = moveNext(current, current.targetEndAt);
  }
  return current;
}

function enterSlot(state: EngineState, slotIndex: number, at: number): EngineState {
  const slot = state.slots[slotIndex];
  if (!slot) {
    return {
      ...state,
      status: 'COMPLETED',
      phase: 'COMPLETED',
      endedAt: at,
    };
  }
  return {
    ...state,
    status: 'LIVE',
    phase: slot.phase,
    slotIndex,
    phaseStartedAt: at,
    targetEndAt: at + Math.max(0, slot.plannedSeconds) * 1000,
    currentReps: 0,
    currentDistance: 0,
  };
}

function closeCurrentSlot(state: EngineState, endedAt: number, outcome: IntervalOutcome): EngineState {
  const slot = currentSlot(state);
  if (!slot || !isActiveInterval(state.phase)) return state;
  const actualSeconds = elapsedSeconds(state, endedAt);
  const draft: IntervalDraft = {
    slotId: slot.slotId,
    exerciseId: slot.exerciseId,
    exerciseName: slot.exerciseName,
    roundIndex: slot.roundIndex,
    exerciseIndex: slot.exerciseIndex,
    phase: slot.phase,
    plannedSeconds: slot.plannedSeconds,
    actualSeconds,
    plannedReps: slot.plannedReps,
    actualReps: slot.phase === 'WORK' ? state.currentReps || undefined : undefined,
    plannedDistance: slot.plannedDistance,
    actualDistance: slot.phase === 'WORK' ? state.currentDistance || undefined : undefined,
    distanceUnit: slot.distanceUnit,
    trackingMode: slot.trackingMode,
    startedAt: state.phaseStartedAt,
    endedAt,
    outcome,
  };
  return {
    ...state,
    intervals: [...state.intervals, draft],
    currentReps: 0,
    currentDistance: 0,
  };
}

function moveNext(state: EngineState, at: number): EngineState {
  const nextIndex = state.slotIndex + 1;
  if (nextIndex >= state.slots.length) {
    return {
      ...state,
      status: 'COMPLETED',
      phase: 'COMPLETED',
      endedAt: at,
    };
  }
  const current = state.slots[state.slotIndex];
  const upcoming = state.slots[nextIndex];
  const crossedRound = current && upcoming && upcoming.roundIndex > current.roundIndex;
  if (crossedRound && state.roundCompleteSeconds > 0) {
    return {
      ...state,
      phase: 'ROUND_COMPLETE',
      slotIndex: nextIndex,
      phaseStartedAt: at,
      targetEndAt: at + state.roundCompleteSeconds * 1000,
    };
  }
  return enterSlot(state, nextIndex, at);
}

function currentSlot(state: EngineState): PlannedSlot | undefined {
  if (state.slotIndex < 0 || state.slotIndex >= state.slots.length) return undefined;
  return state.slots[state.slotIndex];
}

function plannedMsForPhase(state: EngineState): number {
  if (state.phase === 'COUNTDOWN') return state.countdownSeconds * 1000;
  if (state.phase === 'ROUND_COMPLETE') return state.roundCompleteSeconds * 1000;
  const slot = currentSlot(state);
  return (slot?.plannedSeconds ?? 0) * 1000;
}

function elapsedSeconds(state: EngineState, now: number): number {
  return Math.max(0, (now - state.phaseStartedAt) / 1000);
}

function isActiveInterval(phase: WorkoutPhase): boolean {
  return phase === 'WORK' || phase === 'REST' || phase === 'TRANSITION';
}

function allWorkComplete(state: EngineState): boolean {
  const planned = state.slots.filter((slot) => slot.phase === 'WORK').length;
  const done = state.intervals.filter((row) => row.phase === 'WORK' && row.outcome === 'COMPLETED').length;
  return planned > 0 && done === planned;
}

function nextExerciseName(state: EngineState): string | null {
  if (state.phase === 'COUNTDOWN') return state.slots[0]?.exerciseName ?? null;
  const slot = currentSlot(state);
  if (slot?.nextExerciseName) return slot.nextExerciseName;
  const upcoming = state.slots[state.slotIndex + 1];
  return upcoming?.exerciseName ?? null;
}

function targetLabel(slot: PlannedSlot | undefined, phase: WorkoutPhase): string | null {
  if (phase === 'COUNTDOWN') return 'Get ready';
  if (phase === 'ROUND_COMPLETE') return 'Round complete';
  if (phase === 'REST') return 'Rest';
  if (phase === 'TRANSITION') return 'Next';
  if (!slot) return null;
  if (slot.plannedReps && slot.plannedSeconds) return `${slot.plannedReps} reps · ${slot.plannedSeconds} sec`;
  if (slot.plannedReps) return `${slot.plannedReps} reps`;
  if (slot.plannedDistance && slot.distanceUnit) return `${slot.plannedDistance} ${slot.distanceUnit}`;
  if (slot.plannedSeconds) return `${slot.plannedSeconds} sec`;
  return null;
}

export function serializeEngine(state: EngineState): string {
  return JSON.stringify(state);
}

export function deserializeEngine(json: string): EngineState {
  return JSON.parse(json) as EngineState;
}
