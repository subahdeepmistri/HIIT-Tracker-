import type { ImageSourcePropType } from 'react-native';
import type { AVPlaybackSource } from 'expo-av';

export { demoIdForLiveView } from './exerciseDemoLogic';

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
};

export function getExerciseDemo(exerciseId: string | null | undefined): ExerciseDemo | null {
  if (!exerciseId) return null;
  return DEMOS[exerciseId] ?? null;
}
