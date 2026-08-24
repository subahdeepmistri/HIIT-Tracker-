import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Box } from '../primitives/Box';
import { TextPrimitive, Label, Body } from '../primitives/Text';

export interface ChartPoint {
  x: number | string;
  y: number | null;
  label?: string;
  metadata?: Record<string, any>;
}

export interface LineChartProps {
  data: ChartPoint[];
  xKey?: string;
  yKey?: string;
  color?: string;
  strokeWidth?: number;
  showPoints?: boolean;
  pointSize?: number;
  showArea?: boolean;
  areaOpacity?: number;
  showGrid?: boolean;
  gridColor?: string;
  showAxes?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  xFormat?: (value: number | string) => string;
  yFormat?: (value: number) => string;
  minY?: number;
  maxY?: number;
  animate?: boolean;
  animationDuration?: number;
  style?: ViewStyle;
  onPointPress?: (point: ChartPoint, index: number) => void;
}

export function LineChart({
  data,
  color,
  strokeWidth = 2,
  showPoints = true,
  pointSize = 4,
  showArea = false,
  areaOpacity = 0.15,
  showGrid = true,
  gridColor,
  showAxes = true,
  xAxisLabel,
  yAxisLabel,
  xFormat,
  yFormat,
  minY,
  maxY,
  animate = true,
  animationDuration = 500,
  style,
  onPointPress,
}: LineChartProps) {
  const theme = useTheme();
  const validData = data.filter((d) => d.y != null);
  const lineColor = color ?? theme.color.accent;
  const gridLineColor = gridColor ?? theme.color.line;

  if (validData.length === 0) {
    return (
      <Box style={{ backgroundColor: theme.color.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.color.line, padding: 48, alignItems: 'center', gap: 12, ...style }}>
        <TextPrimitive variant="title3" weight="semibold">No data</TextPrimitive>
        <TextPrimitive variant="body2" color={theme.color.muted}>There are no data points to display.</TextPrimitive>
      </Box>
    );
  }

  const yValues = validData.map((d) => d.y!);
  const computedMinY = minY ?? Math.min(...yValues);
  const computedMaxY = maxY ?? Math.max(...yValues);
  const yRange = computedMaxY - computedMinY || 1;

  const xValues = validData.map((_, i) => i);
  const xRange = xValues.length - 1 || 1;

  return (
    <Box style={{ backgroundColor: theme.color.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.color.line, padding: 16, ...style }}>
      {(xAxisLabel || yAxisLabel) && (
        <Box flexDirection="row" alignItems="flex-end" justifyContent="space-between" style={{ marginBottom: 8 }}>
          {yAxisLabel && <Label style={{ writingDirection: 'rtl', transform: [{ rotate: '-90deg' }], marginBottom: 40 }}>{yAxisLabel}</Label>}
          {xAxisLabel && <Label style={{ marginLeft: 40 }}>{xAxisLabel}</Label>}
        </Box>
      )}
      <View style={{ position: 'relative', height: 200 }}>
        {showGrid && (
          <Box style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'column', justifyContent: 'space-between' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <View key={i} style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: gridLineColor, opacity: 0.5 }} />
            ))}
          </Box>
        )}
        <Box style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          {validData.map((point, index) => {
            const x = (index / xRange) * 100;
            const y = ((point.y! - computedMinY) / yRange) * 100;
            return (
              <View
                key={index}
                style={{
                  position: 'absolute',
                  left: `${x}%`,
                  bottom: `${y}%`,
                  width: strokeWidth,
                  height: showArea ? `${y}%` : 0,
                }}>
                {showArea && (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      top: 0,
                      backgroundColor: lineColor,
                      opacity: areaOpacity,
                    }}
                  />
                )}
                {showPoints && (
                  <Pressable
                    onPress={() => onPointPress?.(point, index)}
                    style={{
                      position: 'absolute',
                      bottom: -pointSize,
                      left: -pointSize + strokeWidth / 2,
                      width: pointSize * 2,
                      height: pointSize * 2,
                      borderRadius: pointSize,
                      backgroundColor: lineColor,
                      borderWidth: 2,
                      borderColor: theme.color.surface,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={point.label ?? `${xFormat ? xFormat(point.x) : point.x}: ${yFormat ? yFormat(point.y!) : point.y}`}
                  />
                )}
              </View>
            );
          })}
        </Box>
        {showAxes && (
          <Box flexDirection="row" justifyContent="space-between" style={{ position: 'absolute', bottom: -24, left: 0, right: 0 }}>
            {validData.filter((_, i) => i % Math.ceil(validData.length / 5) === 0).map((point, i) => (
              <Label key={i} style={{ fontSize: 10, color: theme.color.muted, textAlign: 'center', width: `${100 / 5}%` }}>
                {xFormat ? xFormat(point.x) : point.x}
              </Label>
            ))}
          </Box>
        )}
      </View>
    </Box>
  );
}

export interface BarChartProps {
  data: ChartPoint[];
  color?: string;
  showValues?: boolean;
  showGrid?: boolean;
  gridColor?: string;
  showAxes?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  xFormat?: (value: number | string) => string;
  yFormat?: (value: number) => string;
  minY?: number;
  maxY?: number;
  barWidth?: number;
  barGap?: number;
  borderRadius?: number;
  animate?: boolean;
  animationDuration?: number;
  style?: ViewStyle;
  onBarPress?: (point: ChartPoint, index: number) => void;
}

export function BarChart({
  data,
  color,
  showValues = true,
  showGrid = true,
  gridColor,
  showAxes = true,
  xAxisLabel,
  yAxisLabel,
  xFormat,
  yFormat,
  minY = 0,
  maxY,
  barWidth = 40,
  barGap = 12,
  borderRadius = 4,
  animate = true,
  animationDuration = 500,
  style,
  onBarPress,
}: BarChartProps) {
  const theme = useTheme();
  const validData = data.filter((d) => d.y != null);
  const barColor = color ?? theme.color.accent;
  const gridLineColor = gridColor ?? theme.color.line;

  if (validData.length === 0) {
    return (
      <Box style={{ backgroundColor: theme.color.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.color.line, padding: 48, alignItems: 'center', gap: 12, ...style }}>
        <TextPrimitive variant="title3" weight="semibold">No data</TextPrimitive>
        <TextPrimitive variant="body2" color={theme.color.muted}>There are no data points to display.</TextPrimitive>
      </Box>
    );
  }

  const yValues = validData.map((d) => d.y!);
  const computedMaxY = maxY ?? Math.max(...yValues);
  const yRange = computedMaxY - minY || 1;

  return (
    <Box style={{ backgroundColor: theme.color.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.color.line, padding: 16, ...style }}>
      {(xAxisLabel || yAxisLabel) && (
        <Box flexDirection="row" alignItems="flex-end" justifyContent="space-between" style={{ marginBottom: 8 }}>
          {yAxisLabel && <Label style={{ writingDirection: 'rtl', transform: [{ rotate: '-90deg' }], marginBottom: 40 }}>{yAxisLabel}</Label>}
          {xAxisLabel && <Label style={{ marginLeft: 40 }}>{xAxisLabel}</Label>}
        </Box>
      )}
      <View style={{ position: 'relative', height: 200, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: barGap }}>
        {showGrid && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'column', justifyContent: 'space-between' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <View key={i} style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: gridLineColor, opacity: 0.5 }} />
            ))}
          </View>
        )}
        {validData.map((point, index) => {
          const heightPercent = ((point.y! - minY) / yRange) * 100;
          return (
            <Pressable
              key={index}
              onPress={() => onBarPress?.(point, index)}
              style={{
                width: barWidth,
                height: `${heightPercent}%`,
                backgroundColor: barColor,
                borderTopLeftRadius: borderRadius,
                borderTopRightRadius: borderRadius,
                minHeight: point.y! > minY ? 2 : 0,
              }}
              accessibilityRole="button"
              accessibilityLabel={`${xFormat ? xFormat(point.x) : point.x}: ${yFormat ? yFormat(point.y!) : point.y}`}
              accessibilityValue={{ text: yFormat ? yFormat(point.y!) : String(point.y) }}>
              {showValues && point.y! > 0 && (
                <View style={{ position: 'absolute', top: -20, left: 0, right: 0, alignItems: 'center' }}>
                  <TextPrimitive variant="caption1" weight="semibold" color={theme.color.text}>
                    {yFormat ? yFormat(point.y!) : point.y}
                  </TextPrimitive>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      {showAxes && (
        <Box flexDirection="row" justifyContent="space-around" style={{ position: 'absolute', bottom: -24, left: 0, right: 0, paddingHorizontal: barGap / 2 }}>
          {validData.map((point, index) => (
            <Label key={index} style={{ fontSize: 10, color: theme.color.muted, textAlign: 'center', width: barWidth + barGap }}>
              {xFormat ? xFormat(point.x) : point.x}
            </Label>
          ))}
        </Box>
      )}
    </Box>
  );
}

export interface PieChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  innerRadius?: number;
  showLegend?: boolean;
  showLabels?: boolean;
  labelFormat?: (value: number, total: number) => string;
  animate?: boolean;
  animationDuration?: number;
  style?: ViewStyle;
  onSlicePress?: (data: { label: string; value: number; color?: string }, index: number) => void;
}

export function PieChart({
  data,
  innerRadius = 0,
  showLegend = true,
  showLabels = true,
  labelFormat,
  animate = true,
  animationDuration = 500,
  style,
  onSlicePress,
}: PieChartProps) {
  const theme = useTheme();
  const validData = data.filter((d) => d.value > 0);
  const total = validData.reduce((sum, d) => sum + d.value, 0);

  if (validData.length === 0) {
    return (
      <Box style={{ backgroundColor: theme.color.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.color.line, padding: 48, alignItems: 'center', gap: 12, ...style }}>
        <TextPrimitive variant="title3" weight="semibold">No data</TextPrimitive>
        <TextPrimitive variant="body2" color={theme.color.muted}>There are no data points to display.</TextPrimitive>
      </Box>
    );
  }

  const colors = validData.map((d, i) => d.color ?? theme.color.accent);

  return (
    <Box style={{ backgroundColor: theme.color.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.color.line, padding: 16, ...style }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <View style={{ width: 160, height: 160, position: 'relative' }}>
          {validData.map((slice, index) => {
            const percentage = slice.value / total;
            const startAngle = validData.slice(0, index).reduce((sum, d) => sum + d.value / total, 0) * 360;
            const endAngle = startAngle + percentage * 360;

            return (
              <View
                key={index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 160,
                  height: 160,
                  borderRadius: 80,
                  clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.cos((startAngle * Math.PI) / 180)}% ${50 - 50 * Math.sin((startAngle * Math.PI) / 180)}%, ${50 + 50 * Math.cos((endAngle * Math.PI) / 180)}% ${50 - 50 * Math.sin((endAngle * Math.PI) / 180)}%)`,
                  backgroundColor: slice.color,
                }}
              />
            );
          })}
          {innerRadius > 0 && (
            <View
              style={{
                position: 'absolute',
                top: 80 - innerRadius,
                left: 80 - innerRadius,
                width: innerRadius * 2,
                height: innerRadius * 2,
                borderRadius: innerRadius,
                backgroundColor: theme.color.surface,
              }}
            />
          )}
        </View>
        {showLegend && (
          <Box flex={1} gap={8} style={{ maxWidth: 200 }}>
            {validData.map((slice, index) => (
              <Box key={index} flexDirection="row" alignItems="center" gap={8}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: slice.color }} />
                <TextPrimitive variant="body2" flex={1}>{slice.label}</TextPrimitive>
                <TextPrimitive variant="body2" weight="semibold">
                  {labelFormat ? labelFormat(slice.value, total) : `${((slice.value / total) * 100).toFixed(1)}%`}
                </TextPrimitive>
              </Box>
            ))}
          </Box>
        )}
      </View>
    </Box>
  );
}

export interface SparklineProps {
  data: number[];
  color?: string;
  showPoints?: boolean;
  pointSize?: number;
  strokeWidth?: number;
  fillColor?: string;
  style?: ViewStyle;
}

export function Sparkline({ data, color, showPoints = false, pointSize = 3, strokeWidth = 2, fillColor, style }: SparklineProps) {
  const theme = useTheme();
  const lineColor = color ?? theme.color.accent;
  const validData = data.filter((d) => d != null && Number.isFinite(d));

  if (validData.length < 2) {
    return <View style={{ width: 60, height: 24, ...style }} />;
  }

  const minY = Math.min(...validData);
  const maxY = Math.max(...validData);
  const yRange = maxY - minY || 1;

  return (
    <View style={{ width: 60, height: 24, position: 'relative', ...style }}>
      {fillColor && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            top: '50%',
            backgroundColor: fillColor,
            opacity: 0.1,
          }}
        />
      )}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        {validData.map((value, index) => {
          const x = (index / (validData.length - 1)) * 100;
          const y = ((value - minY) / yRange) * 100;
          return (
            <View key={index} style={{ position: 'absolute', left: `${x}%`, bottom: `${y}%`, width: strokeWidth, height: `${y}%`, backgroundColor: lineColor }}>
              {showPoints && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: -pointSize + strokeWidth / 2,
                    left: -pointSize + strokeWidth / 2,
                    width: pointSize * 2,
                    height: pointSize * 2,
                    borderRadius: pointSize,
                    backgroundColor: lineColor,
                    borderWidth: 2,
                    borderColor: theme.color.surface,
                  }}
                />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

export interface ProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  progressColor?: string;
  showValue?: boolean;
  label?: string;
  animate?: boolean;
  style?: ViewStyle;
}

export function ProgressRing({ value, size = 64, strokeWidth = 6, trackColor, progressColor, showValue = true, label, animate = true, style }: ProgressRingProps) {
  const theme = useTheme();
  const clampedValue = Math.min(1, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - clampedValue);

  return (
    <Box alignItems="center" justifyContent="center" style={style}>
      <View style={{ width: size, height: size, transform: [{ rotate: '-90deg' }] }}>
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: trackColor ?? theme.color.surface2,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: progressColor ?? theme.color.accent,
            borderStyle: 'solid',
          }}>
          <Animated.View
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: progressColor ?? theme.color.accent,
              borderStyle: 'solid',
              borderTopColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: 'transparent',
            }}
          />
        </View>
      </View>
      {showValue && (
        <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
          <TextPrimitive variant={size > 80 ? 'display3' : 'headline3'} weight="bold">{Math.round(clampedValue * 100)}%</TextPrimitive>
          {label && <TextPrimitive variant="caption1" color={theme.color.muted}>{label}</TextPrimitive>}
        </View>
      )}
    </Box>
  );
}