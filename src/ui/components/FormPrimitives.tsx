import React from 'react';
import { View, TextInput, Text, Pressable, StyleSheet, Platform, Animated, type TextInputProps, type ViewStyle, type TextStyle } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Label, Body, Strong } from './primitives';

interface BaseInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  placeholderTextColor?: string;
}

export type InputProps = { label?: string; error?: string; hint?: string; leftIcon?: React.ReactNode; rightIcon?: React.ReactNode; style?: ViewStyle; placeholderTextColor?: string } & Omit<TextInputProps, 'style'>;

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  style,
  placeholderTextColor,
  ...props
}: { label?: string; error?: string; hint?: string; leftIcon?: React.ReactNode; rightIcon?: React.ReactNode; style?: ViewStyle; placeholderTextColor?: string } & any) {
  const theme = useTheme();
  const hasError = !!error;

  return (
    <View style={[{ marginBottom: 6 }, style]}>
      {label && <Label>{label}</Label>}
      <View style={styles.inputWrapper}>
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        <TextInput
          {...(props as any)}
          placeholderTextColor={placeholderTextColor ?? theme.color.muted}
          style={[
            styles.input,
            hasError && { borderColor: theme.color.danger },
            { color: theme.color.text, backgroundColor: theme.color.surface } as TextStyle,
            props.style,
          ] as const}
          selectionColor={theme.color.accent}
          caretHidden={false}
        />
        {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
      </View>
      {error ? <Body style={{ color: theme.color.danger, fontSize: 13, marginTop: 6 }}>{error}</Body> : null}
      {hint && !error && <Body style={{ color: theme.color.muted, fontSize: 13, marginTop: 6 }}>{hint}</Body>}
    </View>
  );
}

export type TextAreaProps = { label?: string; error?: string; hint?: string; rows?: number; style?: ViewStyle } & Omit<TextInputProps, 'style'>;

export function TextArea({
  label,
  error,
  hint,
  rows = 4,
  style,
  ...props
}: any) {
  const theme = useTheme();
  const hasError = !!error;

  return (
    <View style={[{ marginBottom: 6 }, style]}>
      {label && <Label>{label}</Label>}
      <View style={[styles.textAreaWrapper, hasError && { borderColor: theme.color.danger }]}>
        <TextInput
          {...(props as any)}
          multiline
          numberOfLines={rows}
          placeholderTextColor={theme.color.muted}
          style={[
            styles.textArea,
            { color: theme.color.text, backgroundColor: theme.color.surface },
            props.style,
          ] as const}
          selectionColor={theme.color.accent}
        />
      </View>
      {error ? <Body style={{ color: theme.color.danger, fontSize: 13, marginTop: 6 }}>{error}</Body> : null}
      {hint && !error && <Body style={{ color: theme.color.muted, fontSize: 13, marginTop: 6 }}>{hint}</Body>}
    </View>
  );
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  label?: string;
  error?: string;
  hint?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function Select({
  label,
  error,
  hint,
  value,
  options,
  onChange,
  disabled,
  accessibilityLabel,
}: SelectProps) {
  const theme = useTheme();
  const hasError = !!error;

  return (
    <View style={{ marginBottom: 6 }}>
      {label && <Label>{label}</Label>}
      <View style={[styles.selectWrapper, hasError && { borderColor: theme.color.danger }]}>
        <TextInput
          value={options.find((o) => o.value === value)?.label ?? ''}
          editable={false}
          onFocus={() => {}}
          style={[
            styles.selectInput,
            { color: theme.color.text, backgroundColor: theme.color.surface },
            disabled && styles.inputDisabled,
          ] as const}
          accessibilityRole="combobox"
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityState={{ disabled }}
          accessibilityValue={{ text: value }}
        />
        <Text style={[styles.selectArrow, { color: theme.color.muted }]}>▼</Text>
      </View>
      {error ? <Body style={{ color: theme.color.danger, fontSize: 13, marginTop: 6 }}>{error}</Body> : null}
      {hint && !error && <Body style={{ color: theme.color.muted, fontSize: 13, marginTop: 6 }}>{hint}</Body>}
    </View>
  );
}

export interface ToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  hint?: string;
  variant?: 'switch' | 'checkbox';
}

export function Toggle({
  label,
  value,
  onChange,
  disabled,
  hint,
  variant = 'switch',
}: ToggleProps) {
  const theme = useTheme();

  if (variant === 'checkbox') {
    return (
      <Pressable
        onPress={() => !disabled && onChange(!value)}
        disabled={disabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: value, disabled }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          minHeight: 48,
          opacity: disabled ? 0.38 : pressed ? 0.8 : 1,
        })}>
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            borderWidth: 2,
            borderColor: value ? theme.color.accent : theme.color.line,
            backgroundColor: value ? theme.color.accent : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {value && <Text style={{ color: theme.color.accentInk, fontSize: 14, lineHeight: 14 }}>✓</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Strong>{label}</Strong>
          {hint && <Body style={{ color: theme.color.muted, marginTop: 2 }}>{hint}</Body>}
        </View>
      </Pressable>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: 48,
        opacity: disabled ? 0.38 : 1,
      }}>
    <View style={{ flex: 1 }}>
      <Strong>{label}</Strong>
      {hint && <Body style={{ color: theme.color.muted, marginTop: 2 }}>{hint}</Body>}
    </View>
    <Pressable
      onPress={() => !disabled && onChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      style={({ pressed }) => ({
        width: 52,
        height: 32,
        borderRadius: 16,
        backgroundColor: value ? theme.color.accent : theme.color.line,
        borderWidth: 1,
        borderColor: theme.color.line,
        justifyContent: 'center',
        paddingHorizontal: 2,
        opacity: pressed ? 0.8 : 1,
      })}>
      <Animated.View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: theme.color.text,
          marginLeft: value ? 20 : 2,
        }} />
    </Pressable>
  </View>
  );
}

export interface StepperProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  suffix?: string;
  accessibilityLabel?: string;
}

export function Stepper({
  label,
  value,
  min = 0,
  max = 99,
  step = 1,
  onChange,
  disabled,
  suffix,
  accessibilityLabel,
}: StepperProps) {
  const theme = useTheme();

  const increment = () => onChange(Math.min(max, value + step));
  const decrement = () => onChange(Math.max(min, value - step));

  const buttonStyle = (isDisabled: boolean, pressed: boolean) => ({
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: theme.color.surface2,
    borderRadius: 12,
    opacity: isDisabled ? 0.38 : pressed ? 0.8 : 1,
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 }}>
      <Strong>{label}</Strong>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ? `${accessibilityLabel}, decrease` : `Decrease ${label}`}
          disabled={disabled || value <= min}
          onPress={() => onChange(Math.max(min, value - step))}
          style={({ pressed }) => buttonStyle(disabled || value <= min, pressed)}>
          <Text style={{ fontFamily: theme.type.uiStrong, color: theme.color.text, fontSize: 20 }}>−</Text>
        </Pressable>
        <View style={{ minWidth: 60, alignItems: 'center' }}>
          <Body>{value}{suffix ? ` ${suffix}` : ''}</Body>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ? `${accessibilityLabel}, increase` : `Increase ${label}`}
          disabled={disabled || value >= max}
          onPress={() => onChange(Math.min(max, value + step))}
          style={({ pressed }) => buttonStyle(disabled || value >= max, pressed)}>
          <Text style={{ fontFamily: theme.type.uiStrong, color: theme.color.text, fontSize: 20 }}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  inputWrapperBase: {} as const,
  // NOTE: error borders use theme.color.danger inline (light/dark aware);
  // the old fixed #EF4444 style was removed in the Phase 8 a11y audit.
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Barlow_500Medium',
    paddingVertical: 0,
  },
  iconLeft: { marginRight: 12 },
  iconRight: { marginLeft: 12 },
  textAreaWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 100,
  },
  textArea: {
    fontSize: 16,
    fontFamily: 'Barlow_500Medium',
    textAlignVertical: 'top',
  },
  selectWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  selectInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Barlow_500Medium',
  },
  selectArrow: { fontSize: 16, marginLeft: 8 },
  inputDisabled: { opacity: 0.38 },
});