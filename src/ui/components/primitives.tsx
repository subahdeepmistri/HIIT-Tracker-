import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type TextProps,
  View,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const theme = useTheme();
  return (
    <View style={[{ flex: 1, backgroundColor: theme.color.bg }, style]}>{children}</View>
  );
}

export function Heading({ children, style, ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: theme.type.display,
          color: theme.color.text,
          fontSize: 40,
          letterSpacing: -0.6,
          lineHeight: 42,
        },
        style,
      ]}>
      {children}
    </Text>
  );
}

export function Label({ children, style, ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: theme.type.uiStrong,
          color: theme.color.muted,
          fontSize: 12,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
        },
        style,
      ]}>
      {children}
    </Text>
  );
}

export function Body({ children, style, ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <Text
      {...rest}
      style={[{ fontFamily: theme.type.uiBook, color: theme.color.text, fontSize: 16, lineHeight: 24 }, style]}>
      {children}
    </Text>
  );
}

export function Strong({ children, style, ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <Text {...rest} style={[{ fontFamily: theme.type.uiStrong, color: theme.color.text, fontSize: 16 }, style]}>
      {children}
    </Text>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.color.surface,
          borderRadius: theme.radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.color.line,
          padding: theme.space[20],
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  large,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'rest';
  disabled?: boolean;
  loading?: boolean;
  large?: boolean;
  accessibilityHint?: string;
}) {
  const theme = useTheme();
  const background =
    variant === 'primary'
      ? theme.color.accent
      : variant === 'danger'
        ? theme.color.danger
        : variant === 'rest'
          ? theme.color.rest
          : 'transparent';
  const color =
    variant === 'primary'
      ? theme.color.accentInk
      : variant === 'rest'
        ? theme.color.restInk
        : variant === 'danger'
          ? '#FFFFFF'
          : theme.color.text;
  const minHeight = large ? theme.touch.live : theme.touch.min;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight,
        minWidth: minHeight,
        paddingHorizontal: 20,
        borderRadius: theme.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: background,
        borderWidth: variant === 'ghost' ? 1 : 0,
        borderColor: theme.color.line,
        opacity: disabled ? 0.45 : pressed ? 0.82 : 1,
      })}>
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={{ fontFamily: theme.type.uiStrong, color, fontSize: large ? 18 : 16 }}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, minWidth: 96 }}>
      <Label>{label}</Label>
      <Text
        style={{
          fontFamily: theme.type.display,
          color: theme.color.text,
          fontSize: 28,
          marginTop: 4,
        }}>
        {value}
      </Text>
      {hint ? <Body style={{ color: theme.color.muted, fontSize: 13, marginTop: 2 }}>{hint}</Body> : null}
    </View>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <Heading style={{ fontSize: 28, lineHeight: 30 }}>{title}</Heading>
      <Body style={{ marginTop: 8 }}>{body}</Body>
      {action ? <View style={{ marginTop: 16 }}>{action}</View> : null}
    </Card>
  );
}

export function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.color.surface2,
        borderRadius: theme.radius.pill,
        padding: 4,
        gap: 4,
      }}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={{
              flex: 1,
              minHeight: 40,
              borderRadius: theme.radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? theme.color.accent : 'transparent',
            }}>
            <Text
              style={{
                fontFamily: theme.type.uiStrong,
                fontSize: 13,
                color: active ? theme.color.accentInk : theme.color.muted,
              }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function IconButton({
  name,
  label,
  onPress,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minWidth: theme.touch.min,
        minHeight: theme.touch.min,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}>
      <Ionicons name={name} size={22} color={color ?? theme.color.text} />
    </Pressable>
  );
}

export function MetricValue({ metric, format }: { metric: { kind: string; value?: unknown; reason?: string }; format: (value: never) => string }) {
  if (metric.kind !== 'value') {
    return <Body style={{ opacity: 0.7 }}>Not enough data</Body>;
  }
  return <Strong>{format(metric.value as never)}</Strong>;
}
