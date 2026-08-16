import { ResizeMode, Video } from 'expo-av';
import React, { useEffect, useState } from 'react';
import { Image, Platform, View } from 'react-native';

import { Label } from '@/src/ui/components/primitives';
import { useTheme } from '@/src/ui/theme/ThemeProvider';
import type { MovementType } from '@/src/domain/types';
import { canPlayDemoVideo, shouldAnimateDemoFrames } from './exerciseDemoLogic';
import { getExerciseDemo } from './exerciseDemos';

export function ExerciseDemo({
  exerciseId,
  caption,
  reducedMotion,
  movementType,
  size = 148,
  width,
  height,
  stretch = false,
  captionPlacement = 'below',
}: {
  exerciseId: string | null;
  caption?: string;
  reducedMotion?: boolean;
  movementType?: MovementType;
  size?: number;
  width?: number;
  height?: number;
  stretch?: boolean;
  captionPlacement?: 'below' | 'overlay' | 'none';
}) {
  const theme = useTheme();
  const demo = getExerciseDemo(exerciseId, movementType);
  const [frame, setFrame] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const useVideo = canPlayDemoVideo(Platform.OS, Boolean(demo?.video)) && !videoFailed;
  const frameWidth = stretch ? '100%' : (width ?? size);
  const frameHeight = height ?? size;
  const showBelowCaption = captionPlacement === 'below' && (stretch || (typeof size === 'number' && size >= 80));
  const showOverlayCaption = captionPlacement === 'overlay' && Boolean(caption);

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
  const mediaStyle = stretch
    ? { width: '100%' as const, height: frameHeight }
    : { width: frameWidth as number, height: frameHeight };

  return (
    <View
      accessible
      accessibilityLabel={caption ? `Form reference, ${caption}` : 'Form reference'}
      style={{
        alignItems: stretch ? 'stretch' : 'center',
        alignSelf: stretch ? 'stretch' : undefined,
        gap: showBelowCaption ? 6 : 0,
      }}>
      <View
        style={{
          ...mediaStyle,
          borderRadius: stretch ? 0 : theme.radius.md,
          overflow: 'hidden',
          borderWidth: stretch ? 0 : 1,
          borderColor: theme.color.line,
          backgroundColor: theme.color.surface2,
        }}>
        <Image
          source={frameSource}
          resizeMode="cover"
          style={mediaStyle}
          accessibilityIgnoresInvertColors
        />
        {useVideo && demo.video ? (
          <Video
            source={demo.video}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              ...mediaStyle,
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
        {showOverlayCaption ? (
          <View
            style={{
              position: 'absolute',
              right: 10,
              bottom: 10,
              backgroundColor: theme.color.accent,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: theme.radius.pill,
            }}>
            <Label style={{ color: theme.color.accentInk, letterSpacing: 1.4 }}>{caption}</Label>
          </View>
        ) : null}
      </View>
      {showBelowCaption ? <Label>{caption ?? 'Form'}</Label> : null}
    </View>
  );
}
