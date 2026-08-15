import { ResizeMode, Video } from 'expo-av';
import React, { useEffect, useState } from 'react';
import { Image, Platform, View } from 'react-native';

import { Label } from '@/src/ui/components/primitives';
import { useTheme } from '@/src/ui/theme/ThemeProvider';
import { canPlayDemoVideo, shouldAnimateDemoFrames } from './exerciseDemoLogic';
import { getExerciseDemo } from './exerciseDemos';

const DEMO_SIZE = 148;

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
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const useVideo = canPlayDemoVideo(Platform.OS, Boolean(demo?.video)) && !videoFailed;

  useEffect(() => {
    setFrame(0);
    setVideoReady(false);
    setVideoFailed(false);
  }, [exerciseId]);

  useEffect(() => {
    if (
      !demo ||
      !shouldAnimateDemoFrames({
        reducedMotion,
        frameCount: demo.frames.length,
        intervalMs: demo.intervalMs,
        videoCovering: useVideo && videoReady,
      })
    ) {
      return undefined;
    }
    const id = setInterval(() => {
      setFrame((current) => (current + 1) % demo.frames.length);
    }, demo.intervalMs);
    return () => clearInterval(id);
  }, [demo, reducedMotion, exerciseId, useVideo, videoReady]);

  if (!demo) return null;

  const frameSource = demo.frames[frame] ?? demo.frames[0];

  return (
    <View
      accessible
      accessibilityLabel={caption ? `Form reference, ${caption}` : 'Form reference'}
      style={{ alignItems: 'center', gap: 6 }}>
      <View
        style={{
          width: DEMO_SIZE,
          height: DEMO_SIZE,
          borderRadius: theme.radius.md,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.color.line,
          backgroundColor: theme.color.surface,
        }}>
        <Image
          source={frameSource}
          resizeMode="cover"
          style={{ width: DEMO_SIZE, height: DEMO_SIZE }}
          accessibilityIgnoresInvertColors
        />
        {useVideo && demo.video ? (
          <Video
            source={demo.video}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: DEMO_SIZE,
              height: DEMO_SIZE,
              opacity: videoReady ? 1 : 0,
            }}
            resizeMode={ResizeMode.COVER}
            shouldPlay={!reducedMotion}
            isLooping
            isMuted
            useNativeControls={false}
            onReadyForDisplay={() => setVideoReady(true)}
            onError={() => {
              setVideoFailed(true);
              setVideoReady(false);
            }}
          />
        ) : null}
      </View>
      <Label>{caption ?? 'Form'}</Label>
    </View>
  );
}
