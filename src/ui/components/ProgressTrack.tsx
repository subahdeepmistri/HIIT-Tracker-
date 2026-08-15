import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Label, Strong } from './primitives';

export function ProgressTrack({
  label,
  detail,
  value,
  color,
  accessibilityLabel,
}: {
  label: string;
  detail: string;
  value: number | null;
  color?: string;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const hasValue = value != null && Number.isFinite(value);
  const fill = hasValue ? Math.min(1, Math.max(0, value)) : 0;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? `${label} ${detail}`}
      accessibilityValue={hasValue ? { min: 0, max: 100, now: Math.round(fill * 100) } : { text: 'Not enough data' }}
      style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Label>{label}</Label>
        <Strong style={{ fontSize: 13, color: theme.color.muted }}>{detail}</Strong>
      </View>
      <View
        style={{
          height: 10,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.color.surface2,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.color.line,
        }}>
        <View
          style={{
            width: `${fill * 100}%`,
            height: '100%',
            backgroundColor: color ?? theme.color.accent,
          }}
        />
      </View>
    </View>
  );
}
