import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/src/ui/theme/ThemeProvider';

export function ProgressDots({ total, index }: { total: number; index: number }) {
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
          <View
            key={`dot-${dot}`}
            style={{
              width: active ? 14 : 8,
              height: 8,
              borderRadius: theme.radius.pill,
              backgroundColor: active ? theme.color.accent : theme.color.line,
            }}
          />
        );
      })}
    </View>
  );
}
