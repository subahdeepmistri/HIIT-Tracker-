import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Body, Label, Strong } from './primitives';

export function ProgressTrack({
  label,
  detail,
  caption,
  value,
  color,
  accessibilityLabel,
  showAsRecordedOnly,
}: {
  label: string;
  detail: string;
  caption?: string;
  value: number | null;
  color?: string;
  accessibilityLabel?: string;
  showAsRecordedOnly?: boolean;
}) {
  const theme = useTheme();
  const hasValue = value != null && Number.isFinite(value);
  const fill = hasValue ? Math.min(1, Math.max(0, value)) : 0;
  const overflow = hasValue && value > 1;
  const isRecordedOnly = showAsRecordedOnly === true;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? `${label} ${detail}${caption ? ` ${caption}` : ''}`}
      accessibilityValue={hasValue ? { min: 0, max: 100, now: Math.round(Math.min(1, value) * 100) } : { text: 'Not enough data' }}
      style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <Label>{label}</Label>
        <Strong style={{ fontSize: 13, color: hasValue ? theme.color.text : theme.color.muted }}>{detail}</Strong>
      </View>
      <View
        style={{
          height: 12,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.color.surface2,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.color.line,
          opacity: hasValue ? 1 : 0.72,
        }}>
        <View
          style={{
            width: `${fill * 100}%`,
            height: '100%',
            backgroundColor: isRecordedOnly ? theme.color.info : color ?? theme.color.accent,
            ...(isRecordedOnly ? { borderRadius: theme.radius.pill } : {}),
          }}
        />
      </View>
      {caption ? (
        <Body style={{ color: theme.color.muted, fontSize: 13 }}>
          {caption}
          {overflow ? ' · over plan' : ''}
        </Body>
      ) : overflow ? (
        <Body style={{ color: theme.color.muted, fontSize: 13 }}>Over plan</Body>
      ) : isRecordedOnly ? (
        <Body style={{ color: theme.color.info, fontSize: 13 }}>Recorded · no target set</Body>
      ) : null}
    </View>
  );
}
