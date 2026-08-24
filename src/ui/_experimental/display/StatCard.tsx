import React from 'react';
import { View, Pressable, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Box } from '../primitives/Box';
import { TextPrimitive, Label, Strong, Body } from '../primitives/Text';

export interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  trend?: { value: number; label?: string; positive?: boolean };
  icon?: React.ReactNode;
  onPress?: () => void;
  accent?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'detailed';
  style?: ViewStyle;
  accessibilityLabel?: string;
}

const sizeTokens = (theme: ReturnType<typeof useTheme>) => ({
  sm: { valueFontSize: 20, labelFontSize: 10, hintFontSize: 11, padding: 12, gap: 2, minWidth: 72, iconSize: 24 },
  md: { valueFontSize: 28, labelFontSize: 12, hintFontSize: 13, padding: 16, gap: 4, minWidth: 96, iconSize: 32 },
  lg: { valueFontSize: 36, labelFontSize: 14, hintFontSize: 14, padding: 24, gap: 6, minWidth: 120, iconSize: 40 },
});

export function StatCard({
  label,
  value,
  hint,
  trend,
  icon,
  onPress,
  accent = false,
  size = 'md',
  variant = 'default',
  style,
  accessibilityLabel,
}: StatCardProps) {
  const theme = useTheme();
  const tokens = sizeTokens(theme)[size];

  const content = (
    <View
      style={{
        padding: tokens.padding,
        backgroundColor: theme.color.surface,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: accent ? theme.color.accent : theme.color.line,
        ...style,
      }}>
      <Box flexDirection="row" alignItems="flex-start" justifyContent="space-between" gap={12}>
        <Box flex={1} minWidth={0} gap={tokens.gap}>
          <Label style={{ fontSize: tokens.labelFontSize }}>{label}</Label>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
            <TextPrimitive
              variant={size === 'sm' ? 'headline3' : size === 'lg' ? 'display2' : 'display3'}
              weight="bold"
              style={{ color: theme.color.text, lineHeight: tokens.valueFontSize + 4 }}>
              {value}
            </TextPrimitive>
            {icon && <Box style={{ marginLeft: 4, marginBottom: 4, width: tokens.iconSize, height: tokens.iconSize }}>{icon}</Box>}
          </View>
          {hint && <Body style={{ color: theme.color.muted, fontSize: tokens.hintFontSize }}>{hint}</Body>}
          {trend && (
            <Box flexDirection="row" alignItems="center" gap={4} style={{ marginTop: 2 }}>
              <TextPrimitive
                variant="caption1"
                weight="semibold"
                color={trend.positive !== false ? theme.color.success : theme.color.danger}>
                {trend.positive !== false ? '↑' : '↓'} {Math.abs(trend.value)}%
              </TextPrimitive>
              {trend.label && <TextPrimitive variant="caption1" color={theme.color.muted}>{trend.label}</TextPrimitive>}
            </Box>
          )}
        </Box>
      </Box>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`}
        onPress={onPress}
        style={({ pressed }) => ({ flex: 1, minWidth: tokens.minWidth, ...style, ...(pressed && { opacity: 0.85 }) })}>
        {content}
      </Pressable>
    );
  }

  return <View style={{ flex: 1, minWidth: tokens.minWidth, ...style }}>{content}</View>;
}

export interface StatCardGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  gap?: number;
  style?: ViewStyle;
}

export function StatCardGrid({ children, columns = 2, gap = 12, style }: StatCardGridProps) {
  const childrenArray = React.Children.toArray(children).filter((c): c is React.ReactElement => React.isValidElement(c));
  const columnWidth = `${100 / columns}%`;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -gap / 2, ...style }}>
      {childrenArray.map((child, index) => (
        <View key={child.key ?? index} style={{ flex: 1, minWidth: columnWidth, maxWidth: columnWidth, marginHorizontal: gap / 2, marginVertical: gap / 2 }}>
          {React.cloneElement(child as React.ReactElement<any>, { style: { flex: 1, ...(child.props as any).style } })}
        </View>
      ))}
    </View>
  );
}

export interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  prefix?: string;
  trend?: { value: number; positive?: boolean; period?: string };
  comparison?: { value: number; label: string; positive?: boolean };
  sparkline?: number[];
  status?: 'normal' | 'warning' | 'critical' | 'success';
  onPress?: () => void;
  style?: ViewStyle;
}

export function MetricCard({
  label,
  value,
  unit,
  prefix,
  trend,
  comparison,
  sparkline,
  status = 'normal',
  onPress,
  style,
}: MetricCardProps) {
  const theme = useTheme();

  const statusColors = {
    normal: theme.color.text,
    warning: theme.color.warn,
    critical: theme.color.danger,
    success: theme.color.success,
  };

  const valueColor = statusColors[status];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({
        backgroundColor: theme.color.surface,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: status !== 'normal' ? statusColors[status] : theme.color.line,
        padding: 16,
        ...style,
        opacity: pressed && onPress ? 0.85 : 1,
      })}>
      <Box flexDirection="row" alignItems="flex-start" justifyContent="space-between" gap={12}>
        <Box flex={1} minWidth={0} gap={6}>
          <Label>{label}</Label>
          <Box flexDirection="row" alignItems="baseline" gap={4}>
            {prefix && <TextPrimitive variant="headline3" weight="bold" color={valueColor}>{prefix}</TextPrimitive>}
            <TextPrimitive variant="display3" weight="bold" color={valueColor}>{value}</TextPrimitive>
            {unit && <TextPrimitive variant="body1" color={theme.color.muted} style={{ marginBottom: 4 }}>{unit}</TextPrimitive>}
          </Box>
          {trend && (
            <Box flexDirection="row" alignItems="center" gap={4}>
              <TextPrimitive
                variant="caption1"
                weight="semibold"
                color={trend.positive !== false ? theme.color.success : theme.color.danger}>
                {trend.positive !== false ? '↑' : '↓'} {Math.abs(trend.value)}%
              </TextPrimitive>
              {trend.period && <TextPrimitive variant="caption1" color={theme.color.muted}>{trend.period}</TextPrimitive>}
            </Box>
          )}
          {comparison && (
            <Box flexDirection="row" alignItems="center" gap={4} style={{ marginTop: 4 }}>
              <TextPrimitive variant="caption1" color={theme.color.muted}>vs</TextPrimitive>
              <TextPrimitive
                variant="caption1"
                weight="semibold"
                color={comparison.positive !== false ? theme.color.success : theme.color.danger}>
                {comparison.value > 0 ? '+' : ''}{comparison.value}%
              </TextPrimitive>
              <TextPrimitive variant="caption1" color={theme.color.muted}>{comparison.label}</TextPrimitive>
            </Box>
          )}
        </Box>
        {sparkline && sparkline.length > 1 && (
          <Sparkline points={sparkline} color={valueColor} size={{ width: 60, height: 32 }} />
        )}
      </Box>
    </Pressable>
  );
}

function Sparkline({ points, color, size }: { points: number[]; color: string; size: { width: number; height: number } }) {
  const minY = Math.min(...points);
  const maxY = Math.max(...points);
  const range = maxY - minY || 1;

  return (
    <View style={{ width: size.width, height: size.height, justifyContent: 'flex-end' }}>
      {points.map((point, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: (i / (points.length - 1)) * size.width,
            bottom: ((point - minY) / range) * size.height,
            width: 2,
            height: 2,
            borderRadius: 1,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}

export interface KPICardProps {
  label: string;
  value: string | number;
  target?: number;
  unit?: string;
  format?: (value: number) => string;
  trend?: number[];
  onPress?: () => void;
  style?: ViewStyle;
}

export function KPICard({ label, value, target, unit, format, trend, onPress, style }: KPICardProps) {
  const theme = useTheme();
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  const progress = target ? Math.min(1, numericValue / target) : null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({
        backgroundColor: theme.color.surface,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.color.line,
        padding: 16,
        ...style,
        opacity: pressed && onPress ? 0.85 : 1,
      })}>
      <Box gap={12}>
        <Box flexDirection="row" alignItems="baseline" justifyContent="space-between" gap={12}>
          <Box flex={1} minWidth={0} gap={2}>
            <Label>{label}</Label>
            <Box flexDirection="row" alignItems="baseline" gap={4}>
              <TextPrimitive variant="display3" weight="bold">{format ? format(numericValue) : String(value)}</TextPrimitive>
              {unit && <TextPrimitive variant="body1" color={theme.color.muted} style={{ marginBottom: 4 }}>{unit}</TextPrimitive>}
            </Box>
          </Box>
          {target && (
            <Box alignItems="flex-end" gap={2}>
              <TextPrimitive variant="caption1" color={theme.color.muted}>Target: {format ? format(target) : target}{unit ?? ''}</TextPrimitive>
              <ProgressBarInline value={progress} size="sm" style={{ width: 60 }} />
            </Box>
          )}
        </Box>
        {trend && trend.length > 1 && (
          <Sparkline points={trend} color={theme.color.accent} size={{ width: '100%', height: 32 }} />
        )}
      </Box>
    </Pressable>
  );
}