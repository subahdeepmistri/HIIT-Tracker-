import React from 'react';
import { View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { useTheme } from '@/src/ui/theme/ThemeProvider';

export function ProgressDots({
  total,
  index,
  reducedMotion,
}: {
  total: number;
  index: number;
  reducedMotion?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${index + 1} of ${total}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }}>
      {Array.from({ length: total }, (_, dot) => {
        const active = dot <= index;
        return (
          <Animated.View
            key={`dot-${dot}-${active ? 'on' : 'off'}`}
            entering={reducedMotion || !active ? undefined : ZoomIn.duration(180)}
            style={{
              width: 8,
              height: 8,
              borderRadius: theme.radius.pill,
              backgroundColor: active ? theme.color.accent : theme.color.surface2,
            }}
          />
        );
      })}
    </View>
  );
}
