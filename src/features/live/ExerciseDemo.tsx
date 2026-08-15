import { ResizeMode, Video } from 'expo-av';
import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import Animated, { Easing, FadeIn } from 'react-native-reanimated';

import { Label } from '@/src/ui/components/primitives';
import { useTheme } from '@/src/ui/theme/ThemeProvider';
import { getExerciseDemo } from './exerciseDemos';

export function ExerciseDemo({
  exerciseId,
  caption,
  reducedMotion,
}: {
  exerciseId: string | null;
  caption?: string;
  reducedMotion?: boolean;
}) {
  const theme = useTheme();
  const demo = getExerciseDemo(exerciseId);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    setFrame(0);
    if (!demo || demo.video || reducedMotion || demo.frames.length < 2 || demo.intervalMs <= 0) {
      return undefined;
    }
    const id = setInterval(() => {
      setFrame((current) => (current + 1) % demo.frames.length);
    }, demo.intervalMs);
    return () => clearInterval(id);
  }, [demo, reducedMotion, exerciseId]);

  if (!demo) return null;

  return (
    <View
      accessible
      accessibilityLabel={caption ? `Form reference, ${caption}` : 'Form reference'}
      style={{ alignItems: 'center', gap: 6 }}>
      <View
        style={{
          width: 148,
          height: 148,
          borderRadius: theme.radius.md,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.color.line,
          backgroundColor: theme.color.surface,
        }}>
        {demo.video ? (
          <Video
            source={demo.video}
            style={{ width: '100%', height: '100%' }}
            resizeMode={ResizeMode.COVER}
            shouldPlay={!reducedMotion}
            isLooping
            isMuted
            useNativeControls={false}
            posterSource={demo.frames[0]}
            usePoster
          />
        ) : (
          <Animated.View
            key={`${exerciseId}-${frame}`}
            entering={reducedMotion ? undefined : FadeIn.duration(140).easing(Easing.out(Easing.quad))}
            style={{ width: '100%', height: '100%' }}>
            <Image source={demo.frames[frame] ?? demo.frames[0]} style={{ width: '100%', height: '100%' }} />
          </Animated.View>
        )}
      </View>
      <Label>{caption ?? 'Form'}</Label>
    </View>
  );
}
