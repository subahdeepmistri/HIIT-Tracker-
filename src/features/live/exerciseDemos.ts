import type { ImageSourcePropType } from 'react-native';
import type { AVPlaybackSource } from 'expo-av';

import type { MovementType } from '../../domain/types';
import { fallbackDemoId } from './exerciseDemoLogic';

export { demoIdForLiveView, fallbackDemoId } from './exerciseDemoLogic';

export interface ExerciseDemo {
  frames: ImageSourcePropType[];
  intervalMs: number;
  video?: AVPlaybackSource;
}

const DEMOS: Record<string, ExerciseDemo> = {
  'ex-high-knees': {
    intervalMs: 340,
    video: require('../../../assets/exercises/high-knees.mp4'),
    frames: [
      require('../../../assets/exercises/high-knees-right.jpg'),
      require('../../../assets/exercises/high-knees-left.jpg'),
    ],
  },
  'ex-mountain-climbers': {
    intervalMs: 360,
    video: require('../../../assets/exercises/mountain-climbers.mp4'),
    frames: [
      require('../../../assets/exercises/mc-near.jpg'),
      require('../../../assets/exercises/mc-plank.jpg'),
      require('../../../assets/exercises/mc-far.jpg'),
      require('../../../assets/exercises/mc-plank.jpg'),
    ],
  },
  'ex-squats': {
    intervalMs: 650,
    video: require('../../../assets/exercises/squats.mp4'),
    frames: [
      require('../../../assets/exercises/squats-b.jpg'),
      require('../../../assets/exercises/squats-a.jpg'),
    ],
  },
  'ex-push-ups': {
    intervalMs: 650,
    video: require('../../../assets/exercises/push-ups.mp4'),
    frames: [
      require('../../../assets/exercises/push-ups-a.jpg'),
      require('../../../assets/exercises/push-ups-b.jpg'),
    ],
  },
  'ex-burpees': {
    intervalMs: 420,
    video: require('../../../assets/exercises/burpees.mp4'),
    frames: [
      require('../../../assets/exercises/burpees-a.jpg'),
      require('../../../assets/exercises/burpees-b.jpg'),
      require('../../../assets/exercises/burpees-c.jpg'),
    ],
  },
  'ex-plank': {
    intervalMs: 0,
    frames: [require('../../../assets/exercises/plank-a.jpg')],
  },
  'ex-lunges': {
    intervalMs: 700,
    frames: [
      require('../../../assets/exercises/lunges-right.jpg'),
      require('../../../assets/exercises/lunges-left.jpg'),
    ],
  },
  'ex-wall-sit': {
    intervalMs: 0,
    frames: [require('../../../assets/exercises/wall-sit-a.jpg')],
  },
  'ex-jumping-jacks': {
    intervalMs: 420,
    frames: [
      require('../../../assets/exercises/jumping-jacks-a.jpg'),
      require('../../../assets/exercises/jumping-jacks-b.jpg'),
    ],
  },
  'ex-jump-rope': {
    intervalMs: 280,
    frames: [
      require('../../../assets/exercises/jump-rope-a.jpg'),
      require('../../../assets/exercises/jump-rope-b.jpg'),
    ],
  },
  'ex-battle-rope': {
    intervalMs: 320,
    frames: [
      require('../../../assets/exercises/battle-rope-a.jpg'),
      require('../../../assets/exercises/battle-rope-b.jpg'),
    ],
  },
  'ex-running': {
    intervalMs: 360,
    frames: [
      require('../../../assets/exercises/running-a.jpg'),
      require('../../../assets/exercises/running-b.jpg'),
    ],
  },
  'ex-cycling': {
    intervalMs: 400,
    frames: [
      require('../../../assets/exercises/cycling-a.jpg'),
      require('../../../assets/exercises/cycling-b.jpg'),
    ],
  },
  'ex-walking': {
    intervalMs: 500,
    frames: [
      require('../../../assets/exercises/walking-a.jpg'),
      require('../../../assets/exercises/walking-b.jpg'),
    ],
  },
  'ex-box-jumps': {
    intervalMs: 700,
    frames: [
      require('../../../assets/exercises/box-jumps-b.jpg'),
      require('../../../assets/exercises/box-jumps-a.jpg'),
    ],
  },
  'ex-skater-hops': {
    intervalMs: 420,
    frames: [
      require('../../../assets/exercises/skater-hops-a.jpg'),
      require('../../../assets/exercises/skater-hops-b.jpg'),
    ],
  },
  'ex-sit-ups': {
    intervalMs: 700,
    frames: [
      require('../../../assets/exercises/sit-ups-down.jpg'),
      require('../../../assets/exercises/sit-ups-up.jpg'),
    ],
  },
  'ex-bicycle-crunch': {
    intervalMs: 450,
    frames: [
      require('../../../assets/exercises/bicycle-a.jpg'),
      require('../../../assets/exercises/bicycle-b.jpg'),
    ],
  },
  'ex-flutter-kicks': {
    intervalMs: 320,
    frames: [
      require('../../../assets/exercises/flutter-kicks-a.jpg'),
      require('../../../assets/exercises/flutter-kicks-b.jpg'),
    ],
  },
  'ex-dumbbell-thruster': {
    intervalMs: 650,
    frames: [
      require('../../../assets/exercises/thruster-a.jpg'),
      require('../../../assets/exercises/thruster-b.jpg'),
    ],
  },
  'ex-kb-swing': {
    intervalMs: 560,
    frames: [
      require('../../../assets/exercises/kb-swing-hike.jpg'),
      require('../../../assets/exercises/kb-swing-float.jpg'),
    ],
  },
  'ex-shoulder-taps': {
    intervalMs: 500,
    frames: [
      require('../../../assets/exercises/shoulder-taps-b.jpg'),
      require('../../../assets/exercises/shoulder-taps-a.jpg'),
    ],
  },
  'ex-tricep-dips': {
    intervalMs: 700,
    frames: [
      require('../../../assets/exercises/dips-top.jpg'),
      require('../../../assets/exercises/dips-bottom.jpg'),
    ],
  },
  'ex-glute-bridge': {
    intervalMs: 700,
    frames: [
      require('../../../assets/exercises/glute-bridge-down.jpg'),
      require('../../../assets/exercises/glute-bridge-up.jpg'),
    ],
  },
  'ex-shadow-boxing': {
    intervalMs: 360,
    frames: [
      require('../../../assets/exercises/shadow-boxing-a.jpg'),
      require('../../../assets/exercises/shadow-boxing-b.jpg'),
    ],
  },
  'ex-bear-crawl': {
    intervalMs: 420,
    frames: [
      require('../../../assets/exercises/bear-crawl-a.jpg'),
      require('../../../assets/exercises/bear-crawl-b.jpg'),
    ],
  },
  'ex-rest-hold': {
    intervalMs: 520,
    frames: [
      require('../../../assets/exercises/march-a.jpg'),
      require('../../../assets/exercises/march-b.jpg'),
    ],
  },
  'ex-inchworm': {
    intervalMs: 700,
    frames: [
      require('../../../assets/exercises/inchworm-a.jpg'),
      require('../../../assets/exercises/inchworm-b.jpg'),
    ],
  },
};

export function catalogDemoIds(): string[] {
  return Object.keys(DEMOS);
}

export function getExerciseDemo(
  exerciseId: string | null | undefined,
  movementType?: MovementType,
): ExerciseDemo | null {
  if (exerciseId && DEMOS[exerciseId]) return DEMOS[exerciseId];
  const fallback = fallbackDemoId(movementType);
  if (fallback && DEMOS[fallback]) return DEMOS[fallback];
  return null;
}
