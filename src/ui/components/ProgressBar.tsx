import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Body, Label, Strong } from './primitives';

export interface ProgressBarProps {
  /** Label shown to the left of the bar */
  label: string;
  /** Main value text (e.g., "68%", "18 reps", "Not enough data") */
  detail: string;
  /** Optional caption below the bar (e.g., "18 / 20 reps", "55s / 1m 20s") */
  caption?: string;
  /** Progress value 0–1 (1 = 100%). null/undefined = indeterminate/empty */
  value: number | null;
  /** Custom fill color; defaults to accent */
  color?: string;
  /** Accessibility label override */
  accessibilityLabel?: string;
  /** If true, renders as "recorded-only" (info color, full bar, "no target" caption) */
  showAsRecordedOnly?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show overflow indicator when value > 1 */
  showOverflow?: boolean;
}

/**
 * Canonical progress bar primitive.
 * - value: null/undefined → empty track, "Not enough data"
 * - value 0–1 → clamped fill, percentage detail
 * - value > 1 → overflow flag, capped fill
 * - showAsRecordedOnly → info color, fill=1, "Recorded · no target set" caption
 * All variants expose proper ARIA progressbar semantics.
 */
export function ProgressBar({
  label,
  detail,
  caption,
  value,
  color,
  accessibilityLabel,
  showAsRecordedOnly,
  size = 'md',
  showOverflow = true,
}: ProgressBarProps) {
  const theme = useTheme();
  const hasValue = value != null && Number.isFinite(value);
  const fill = hasValue ? Math.min(1, Math.max(0, value)) : 0;
  const overflow = hasValue && value > 1 && showOverflow;
  const isRecordedOnly = showAsRecordedOnly === true;

  // Size tokens
  const trackHeight = size === 'sm' ? 8 : size === 'lg' ? 16 : 12;
  const labelFontSize = size === 'sm' ? 11 : size === 'lg' ? 14 : 13;
  const detailFontSize = size === 'sm' ? 11 : size === 'lg' ? 13 : 13;
  const captionFontSize = size === 'sm' ? 10 : size === 'lg' ? 13 : 13;
  const gap = size === 'sm' ? 4 : size === 'lg' ? 8 : 6;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? `${label} ${detail}${caption ? ` ${caption}` : ''}`}
      accessibilityValue={
        hasValue
          ? { min: 0, max: 100, now: Math.round(Math.min(1, value) * 100) }
          : { text: 'Not enough data' }
      }
      style={{ gap }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <Label style={{ fontSize: labelFontSize }}>{label}</Label>
        <Strong
          style={{
            fontSize: detailFontSize,
            color: hasValue ? theme.color.text : theme.color.muted,
          }}>
          {detail}
        </Strong>
      </View>
      <View
        style={{
          height: trackHeight,
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
            borderRadius: isRecordedOnly ? theme.radius.pill : 0,
          }}
        />
      </View>
      {caption ? (
        <Body style={{ color: theme.color.muted, fontSize: captionFontSize }}>
          {caption}
          {overflow ? ' · over plan' : ''}
        </Body>
      ) : overflow ? (
        <Body style={{ color: theme.color.muted, fontSize: captionFontSize }}>Over plan</Body>
      ) : isRecordedOnly ? (
        <Body style={{ color: theme.color.info, fontSize: captionFontSize }}>
          Recorded · no target set
        </Body>
      ) : null}
    </View>
  );
}

/**
 * Tiny progress indicator (just the bar, no label/detail) — for inline use in lists.
 */
export function ProgressBarInline({
  value,
  color,
  size = 'sm',
  showAsRecordedOnly,
  accessibilityLabel,
}: {
  value: number | null;
  color?: string;
  size?: 'sm' | 'md';
  showAsRecordedOnly?: boolean;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const hasValue = value != null && Number.isFinite(value);
  const fill = hasValue ? Math.min(1, Math.max(0, value)) : 0;
  const isRecordedOnly = showAsRecordedOnly === true;
  const trackHeight = size === 'sm' ? 6 : 8;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? 'Progress'}
      accessibilityValue={hasValue ? { min: 0, max: 100, now: Math.round(fill * 100) } : { text: 'Not enough data' }}
      style={{ flex: 1, minWidth: 0 }}>
      <View
        style={{
          height: trackHeight,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.color.surface2,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.color.line,
          opacity: hasValue ? 1 : 0.5,
        }}>
        <View
          style={{
            width: `${fill * 100}%`,
            height: '100%',
            backgroundColor: isRecordedOnly ? theme.color.info : color ?? theme.color.accent,
            borderRadius: isRecordedOnly ? theme.radius.pill : 0,
          }}
        />
      </View>
    </View>
  );
}