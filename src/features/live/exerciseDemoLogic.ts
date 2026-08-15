import type { LiveView } from '../../engine/workout/stateMachine';

export const VIDEO_DEMO_IDS = [
  'ex-high-knees',
  'ex-mountain-climbers',
  'ex-squats',
  'ex-push-ups',
  'ex-burpees',
] as const;

export function demoIdForLiveView(
  view: Pick<LiveView, 'phase' | 'currentExerciseId' | 'nextExerciseId'>,
): string | null {
  if (view.phase === 'REST' || view.phase === 'TRANSITION' || view.phase === 'ROUND_COMPLETE') {
    return view.nextExerciseId;
  }
  return view.currentExerciseId;
}
