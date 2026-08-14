import React from 'react';
import { Text, View } from 'react-native';

import type { WorkoutPhase } from '../../domain/types';
import { useTheme } from '../theme/ThemeProvider';

export function PhaseBadge({ phase }: { phase: WorkoutPhase }) {
  const theme = useTheme();
  const map: Record<WorkoutPhase, { label: string; bg: string; fg: string }> = {
    IDLE: { label: 'Idle', bg: theme.color.surface2, fg: theme.color.muted },
    COUNTDOWN: { label: 'Get ready', bg: theme.color.surface2, fg: theme.color.text },
    WORK: { label: 'Work', bg: theme.color.accent, fg: theme.color.accentInk },
    REST: { label: 'Rest', bg: theme.color.rest, fg: theme.color.restInk },
    TRANSITION: { label: 'Next', bg: theme.color.surface2, fg: theme.color.text },
    ROUND_COMPLETE: { label: 'Round complete', bg: theme.color.success, fg: '#062016' },
    PAUSED: { label: 'Paused', bg: theme.color.warn, fg: '#1A1003' },
    COMPLETED: { label: 'Complete', bg: theme.color.success, fg: '#062016' },
    CANCELLED: { label: 'Cancelled', bg: theme.color.danger, fg: '#fff' },
  };
  const item = map[phase];
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: item.bg,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
      }}>
      <Text
        style={{
          fontFamily: theme.type.uiStrong,
          color: item.fg,
          letterSpacing: 1.1,
          textTransform: 'uppercase',
          fontSize: 12,
        }}>
        {item.label}
      </Text>
    </View>
  );
}
