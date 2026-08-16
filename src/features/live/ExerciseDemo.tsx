import React, { useEffect, useState } from 'react';
import { Image, Platform, View } from 'react-native';

import { Label } from '@/src/ui/components/primitives';
import { useTheme } from '@/src/ui/theme/ThemeProvider';
import type { MovementType } from '@/src/domain/types';
import { canPlayDemoVideo, shouldAnimateDemoFrames } from './exerciseDemoLogic';
import type { ExerciseDemo as Demo } from './exerciseDemos';

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
  const [demo, setDemo] = useState<Demo | null>(null);
  const [frame, setFrame] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const useVideo = canPlayDemoVideo(Platform.OS, Boolean(demo?.video)) && !videoFailed;
  const frameWidth = stretch ? '100%' : (width ?? size);
  const frameHeight = height ?? size;
  const showBelowCaption = captionPlacement === 'below' && (stretch || (typeof size === 'number' && size >= 80));
  const showOverlayCaption = captionPlacement === 'overlay' && Boolean(caption);

  useEffect(() => {
    let live = true;
    setDemo(null);
    setFrame(0);
    setVideoReady(false);
    setVideoFailed(false);
    void import('./exerciseDemos').then((mod) => {
      if (!live) return;
      setDemo(mod.getExerciseDemo(exerciseId, movementType));
    });
    return () => {
      live = false;
    };
  }, [exerciseId, movementType]);

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
          <NativeLoopVideo
            source={demo.video}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              ...mediaStyle,
              opacity: videoReady ? 1 : 0,
            }}
            reducedMotion={reducedMotion}
            onReady={() => setVideoReady(true)}
            onFailed={() => {
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

function NativeLoopVideo({
  source,
  style,
  reducedMotion,
  onReady,
  onFailed,
}: {
  source: unknown;
  style: object;
  reducedMotion?: boolean;
  onReady: () => void;
  onFailed: () => void;
}) {
  const [Video, setVideo] = useState<React.ComponentType<Record<string, unknown>> | null>(null);

  useEffect(() => {
    let live = true;
    void import('expo-av').then((mod) => {
      if (live) setVideo(() => mod.Video as React.ComponentType<Record<string, unknown>>);
    });
    return () => {
      live = false;
    };
  }, []);

  if (!Video) return null;
  return (
    <Video
      source={source}
      style={style}
      resizeMode="cover"
      shouldPlay={!reducedMotion}
      isLooping
      isMuted
      useNativeControls={false}
      onReadyForDisplay={onReady}
      onError={onFailed}
    />
  );
}
