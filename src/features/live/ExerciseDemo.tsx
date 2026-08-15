import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';

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
    if (!demo || reducedMotion || demo.frames.length < 2 || demo.intervalMs <= 0) return undefined;
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
        <Image source={demo.frames[frame] ?? demo.frames[0]} style={{ width: '100%', height: '100%' }} />
      </View>
      <Label>{caption ?? 'Form'}</Label>
    </View>
  );
}
