import type { LiveView } from '../../engine/workout/stateMachine';

export const VIDEO_DEMO_IDS = [
  'ex-high-knees',
  'ex-mountain-climbers',
  'ex-squats',
  'ex-push-ups',
  'ex-burpees',
] as const;

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

export function demoIdForLiveView(
  view: Pick<LiveView, 'phase' | 'currentExerciseId' | 'nextExerciseId'>,
): string | null {
  if (view.phase === 'REST' || view.phase === 'TRANSITION' || view.phase === 'ROUND_COMPLETE') {
    return view.nextExerciseId;
  }
  return view.currentExerciseId;
}
