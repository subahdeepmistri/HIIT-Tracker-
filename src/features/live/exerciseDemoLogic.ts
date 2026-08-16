import type { MovementType } from '../../domain/types';
import type { LiveView } from '../../engine/workout/stateMachine';

export const CATALOG_DEMO_IDS = [
  'ex-high-knees',
  'ex-mountain-climbers',
  'ex-squats',
  'ex-push-ups',
  'ex-burpees',
  'ex-plank',
  'ex-lunges',
  'ex-wall-sit',
  'ex-jumping-jacks',
  'ex-jump-rope',
  'ex-battle-rope',
  'ex-running',
  'ex-cycling',
  'ex-walking',
  'ex-box-jumps',
  'ex-skater-hops',
  'ex-sit-ups',
  'ex-bicycle-crunch',
  'ex-flutter-kicks',
  'ex-dumbbell-thruster',
  'ex-kb-swing',
  'ex-shoulder-taps',
  'ex-tricep-dips',
  'ex-glute-bridge',
  'ex-shadow-boxing',
  'ex-bear-crawl',
  'ex-rest-hold',
  'ex-inchworm',
] as const;

export const VIDEO_DEMO_IDS = [
  'ex-high-knees',
  'ex-mountain-climbers',
  'ex-squats',
  'ex-push-ups',
  'ex-burpees',
] as const;

const MOVEMENT_FALLBACK: Record<MovementType, string> = {
  isometric: 'ex-plank',
  locomotion: 'ex-high-knees',
  plyometric: 'ex-jumping-jacks',
  dynamic: 'ex-mountain-climbers',
  cyclical: 'ex-jump-rope',
  strength: 'ex-squats',
};

/** Web expo-av Video does not reliably paint bundled MP4s. Frames must stay visible. */
export function canPlayDemoVideo(platform: string, hasVideo: boolean): boolean {
  return hasVideo && platform !== 'web';
}

export function shouldAnimateDemoFrames(input: {
  reducedMotion?: boolean;
  frameCount: number;
  intervalMs: number;
  videoCovering?: boolean;
}): boolean {
  if (input.videoCovering) return false;
  if (input.reducedMotion) return false;
  return input.frameCount >= 2 && input.intervalMs > 0;
}

export function fallbackDemoId(movementType?: MovementType): string | null {
  if (!movementType) return null;
  return MOVEMENT_FALLBACK[movementType] ?? null;
}

export function demoIdForLiveView(
  view: Pick<LiveView, 'phase' | 'currentExerciseId' | 'nextExerciseId'>,
): string | null {
  if (view.phase === 'REST' || view.phase === 'TRANSITION' || view.phase === 'ROUND_COMPLETE') {
    return view.nextExerciseId;
  }
  return view.currentExerciseId;
}
