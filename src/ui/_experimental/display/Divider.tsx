import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Box } from '../primitives/Box';
import { TextPrimitive } from '../primitives/Text';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  variant?: 'solid' | 'dashed' | 'dotted';
  thickness?: number;
  color?: string;
  label?: string;
  labelPosition?: 'start' | 'center' | 'end';
  style?: ViewStyle;
}

export function Divider({
  orientation = 'horizontal',
  variant = 'solid',
  thickness = 1,
  color,
  label,
  labelPosition = 'center',
  style,
}: DividerProps) {
  const theme = useTheme();
  const dividerColor = color ?? theme.color.line;

  const lineStyle: ViewStyle = {
    borderStyle: variant,
    ...(orientation === 'horizontal'
      ? { borderBottomWidth: thickness, width: '100%' }
      : { borderRightWidth: thickness, height: '100%' }),
    borderColor: dividerColor,
    opacity: 0.5,
  };

  if (!label) {
    return <View style={[lineStyle, style]} />;
  }

  return (
    <Box flexDirection={orientation === 'horizontal' ? 'row' : 'column'} alignItems="center" gap={12} style={style}>
      {labelPosition === 'start' && <TextPrimitive variant="caption1" color={theme.color.muted}>{label}</TextPrimitive>}
      <View style={[lineStyle, { flex: 1 }]} />
      {labelPosition === 'center' && (
        <TextPrimitive variant="caption1" color={theme.color.muted} style={{ whiteSpace: 'nowrap' }}>
          {label}
        </TextPrimitive>
      )}
      <View style={[lineStyle, { flex: 1 }]} />
      {labelPosition === 'end' && <TextPrimitive variant="caption1" color={theme.color.muted}>{label}</TextPrimitive>}
    </Box>
  );
}

export interface SectionDividerProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  style?: ViewStyle;
}

export function SectionDivider({ title, subtitle, action, style }: SectionDividerProps) {
  const theme = useTheme();
  return (
    <Box flexDirection="row" alignItems="center" justifyContent="space-between" gap={12} style={{ marginVertical: 8, ...style }}>
      <Box gap={2}>
        <TextPrimitive variant="title3" weight="semibold">{title}</TextPrimitive>
        {subtitle && <TextPrimitive variant="caption1" color={theme.color.muted}>{subtitle}</TextPrimitive>}
      </Box>
      {action}
    </Box>
  );
}

export interface ListDividerProps {
  inset?: boolean;
  style?: ViewStyle;
}

export function ListDivider({ inset = false, style }: ListDividerProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.color.line,
        marginLeft: inset ? 56 : 0,
        ...style,
      }}
    />
  );
}