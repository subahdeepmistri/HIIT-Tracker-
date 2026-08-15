import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { Units } from '../../domain/units';
import { Body } from '../components/primitives';
import { useTheme } from '../theme/ThemeProvider';

export interface ChartPoint {
  label: string;
  value: number;
}

export function LineChart({
  points,
  height = 148,
  formatValue,
  accessibilityLabel,
}: {
  points: ChartPoint[];
  height?: number;
  formatValue?: (value: number) => string;
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  const width = 320;
  if (points.length === 0) {
    return <Body style={{ color: theme.color.muted, marginTop: 8 }}>Not enough data</Body>;
  }

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const padX = 16;
  const padY = 22;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const coords = points.map((point, index) => {
    const x = padX + (points.length === 1 ? innerW / 2 : (index / (points.length - 1)) * innerW);
    const y = padY + innerH - ((point.value - min) / span) * innerH;
    return { ...point, x, y };
  });
  const polyline = coords.map((point) => `${point.x},${point.y}`).join(' ');
  const latest = points[points.length - 1];
  const latestText = latest
    ? `${latest.label} · ${formatValue ? formatValue(latest.value) : Units.formatCompactDuration(latest.value)}`
    : '';

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Line x1={padX} y1={padY} x2={padX} y2={height - padY} stroke={theme.color.line} strokeWidth={1} />
        <Line
          x1={padX}
          y1={height - padY}
          x2={width - padX}
          y2={height - padY}
          stroke={theme.color.line}
          strokeWidth={1}
        />
        <Polyline points={polyline} fill="none" stroke={theme.color.accent} strokeWidth={2} />
        {coords.map((point) => (
          <Circle key={`${point.label}-${point.x}`} cx={point.x} cy={point.y} r={3.5} fill={theme.color.accent} />
        ))}
        <SvgText x={padX} y={14} fill={theme.color.muted} fontSize="10">
          {formatValue ? formatValue(max) : String(max)}
        </SvgText>
        <SvgText x={padX} y={height - 4} fill={theme.color.muted} fontSize="10">
          {points[0]?.label}
        </SvgText>
        <SvgText x={width - 70} y={height - 4} fill={theme.color.muted} fontSize="10">
          {points[points.length - 1]?.label}
        </SvgText>
      </Svg>
      <Body style={{ color: theme.color.muted, fontSize: 13, marginTop: 6 }}>
        Latest {latestText}
        {points.length > 1 ? ` · ${points.length} sessions` : ''}
      </Body>
    </View>
  );
}
