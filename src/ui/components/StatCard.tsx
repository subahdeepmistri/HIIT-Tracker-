import React from 'react';
import { View, Text, Pressable, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Label, Body, Strong } from './primitives';

export interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  accent?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  onPress,
  accent,
  size = 'md',
  style,
}: StatCardProps) {
  const theme = useTheme();

  const valueFontSize = size === 'sm' ? 20 : size === 'lg' ? 36 : 28;
  const labelFontSize = size === 'sm' ? 10 : size === 'lg' ? 14 : 12;
  const hintFontSize = size === 'sm' ? 11 : size === 'lg' ? 14 : 13;
  const padding = size === 'sm' ? 12 : size === 'lg' ? 24 : 16;
  const gap = size === 'sm' ? 2 : size === 'lg' ? 6 : 4;

  const content = (
    <View style={{ padding, backgroundColor: theme.color.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: accent ? theme.color.accent : theme.color.line, ...style }}>
      <Label style={{ fontSize: labelFontSize }}>{label}</Label>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: gap }}>
        <Text style={{ fontFamily: theme.type.display, color: theme.color.text, fontSize: valueFontSize, lineHeight: valueFontSize + 4 }}>{value}</Text>
        {icon && <View style={{ marginLeft: 8, marginBottom: 4 }}>{icon}</View>}
      </View>
      {hint ? <Body style={{ color: theme.color.muted, fontSize: hintFontSize, marginTop: 2 }}>{hint}</Body> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable accessible accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ flex: 1, minWidth: size === 'sm' ? 72 : 96, ...style, ...(pressed && { opacity: 0.85 }) })}>
        {content}
      </Pressable>
    );
  }

  return <View style={{ flex: 1, minWidth: size === 'sm' ? 72 : 96, ...style }}>{content}</View>;
}

interface ChildWithStyle {
  style?: ViewStyle;
}

export function StatCardGrid({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<ChildWithStyle>, { style: { flex: 1, minWidth: '45%', marginHorizontal: 6, marginVertical: 6, ...(child.props as ChildWithStyle).style } })
          : child,
      )}
    </View>
  );
}