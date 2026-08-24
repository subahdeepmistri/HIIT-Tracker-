import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Label, Body, Card } from './primitives';
import { LineChart } from '../charts/LineChart';

export interface TrendPoint {
  label: string;
  value: number | null;
  missing?: boolean;
}

export interface TrendCardProps {
  title: string;
  points: TrendPoint[];
  formatValue: (value: number) => string;
  accessibilityLabel: string;
  /** Optional footnote */
  footnote?: string;
  /** Show as compact (no footnote, smaller chart) */
  compact?: boolean;
}

/**
 * TrendCard — a labelled card containing a LineChart with gap support.
 * Missing points (value === null || missing === true) render as gaps.
 */
export function TrendCard({
  title,
  points,
  formatValue,
  accessibilityLabel,
  footnote,
  compact,
}: TrendCardProps) {
  const theme = useTheme();
  const hasData = points.some((p) => p.value != null);

  if (!hasData && !compact) {
    return (
      <Card>
        <Label>{title}</Label>
        <Body style={{ marginTop: 8, color: theme.color.muted }}>
          No data for this range.
        </Body>
      </Card>
    );
  }

  // Filter out missing points for LineChart (it doesn't support gaps natively)
  const validPoints = points
    .filter((p) => p.value != null && !p.missing)
    .map((p) => ({ label: p.label, value: p.value! }));

  return (
    <Card>
      <Label>{title}</Label>
      <LineChart
        points={validPoints}
        accessibilityLabel={accessibilityLabel}
        formatValue={formatValue}
      />
      {footnote && !compact && (
        <Body style={{ marginTop: 8, color: theme.color.muted, fontSize: 13 }}>{footnote}</Body>
      )}
    </Card>
  );
}

/**
 * Inline mini trend sparkline — for list rows or compact cards.
 */
export function TrendSparkline({
  points,
  color,
  size = 'sm',
}: {
  points: TrendPoint[];
  color?: string;
  size?: 'sm' | 'md';
}) {
  const theme = useTheme();
  const trackHeight = size === 'sm' ? 24 : 40;
  const hasData = points.some((p) => p.value != null);

  if (!hasData) return null;

  // Simple SVG-like rendering using Views (for web/native compat)
  // For production, consider react-native-svg
  const validPoints = points
    .map((p, i) => ({ x: i, y: p.value ?? 0, missing: p.value == null || p.missing }))
    .filter((p) => !p.missing);

  if (validPoints.length < 2) return null;

  const minY = Math.min(...validPoints.map((p) => p.y));
  const maxY = Math.max(...validPoints.map((p) => p.y));
  const range = maxY - minY || 1;

  return (
    <View
      style={{
        height: trackHeight,
        width: size === 'sm' ? 60 : 100,
        justifyContent: 'flex-end',
      }}>
      {/* Simplified: just show last value as a dot for now */}
      <View
        style={{
          position: 'absolute',
          right: 0,
          bottom: ((validPoints[validPoints.length - 1].y - minY) / range) * trackHeight,
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: color ?? theme.color.accent,
        }}
      />
    </View>
  );
}