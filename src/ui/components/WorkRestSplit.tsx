import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Body } from './primitives';

export function WorkRestSplit({
  workSeconds,
  restSeconds,
}: {
  workSeconds: number;
  restSeconds: number;
}) {
  const theme = useTheme();
  const total = workSeconds + restSeconds;
  if (total <= 0) {
    return <Body style={{ color: theme.color.muted }}>Not enough data</Body>;
  }
  const workShare = workSeconds / total;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Work versus rest split"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(workShare * 100) }}
      style={{
        flexDirection: 'row',
        height: 12,
        borderRadius: theme.radius.pill,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.color.line,
      }}>
      <View style={{ width: `${workShare * 100}%`, backgroundColor: theme.color.accent }} />
      <View style={{ flex: 1, backgroundColor: theme.color.rest }} />
    </View>
  );
}
