import type { LiveView } from '../../engine/workout/stateMachine';

export function demoIdForLiveView(
  view: Pick<LiveView, 'phase' | 'currentExerciseId' | 'nextExerciseId'>,
): string | null {
  if (view.phase === 'REST' || view.phase === 'TRANSITION' || view.phase === 'ROUND_COMPLETE') {
    return view.nextExerciseId;
  }
  return view.currentExerciseId;
}
