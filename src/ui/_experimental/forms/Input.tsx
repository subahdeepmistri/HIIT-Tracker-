import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { TextInput, View, StyleSheet, Platform, Animated, type TextInputProps, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Label, Body, TextPrimitive } from '../primitives';
import { Box } from '../primitives/Box';
import { PressablePrimitive } from '../primitives/Pressable';

export interface InputProps extends Omit<TextInputProps, 'style' | 'onChangeText' | 'value'> {
  label?: string;
  error?: string;
  hint?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  style?: ViewStyle;
  placeholderTextColor?: string;
  required?: boolean;
  disabled?: boolean;
  value?: string;
  onChangeText?: (text: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  inputMode?: 'text' | 'numeric' | 'decimal' | 'email' | 'tel' | 'url' | 'search';
  autoComplete?: string;
  maxLength?: number;
  showCharacterCount?: boolean;
  clearable?: boolean;
}

const InputInner = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const theme = useTheme();
  const {
    label,
    error,
    hint,
    leftElement,
    rightElement,
    style,
    placeholderTextColor,
    required = false,
    disabled = false,
    value = '',
    onChangeText,
    onBlur,
    onFocus,
    inputMode,
    autoComplete,
    maxLength,
    showCharacterCount = false,
    clearable = false,
    placeholder,
    secureTextEntry = false,
    ...rest
  } = props;

  const hasError = !!error;
  const isFocused = false;
  const [showPassword, setShowPassword] = useState(!secureTextEntry);

  const handleClear = () => {
    onChangeText?.('');
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    onBlur?.();
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    onFocus?.();
  };

  useImperativeHandle(ref, () => ({
    focus: () => {},
    blur: () => {},
    clear: handleClear,
  }));

  return (
    <View style={[{ marginBottom: 6 }, style]}>
      {(label || required) && (
        <Label style={{ marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {label}
          {required && <TextPrimitive variant="caption1" color={theme.color.danger}>*</TextPrimitive>}
        </Label>
      )}
      <View style={styles.inputWrapper}>
        {leftElement && <View style={styles.elementLeft}>{leftElement}</View>}
        <TextInput
          {...rest}
          value={value}
          onChangeText={onChangeText}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor ?? theme.color.muted}
          secureTextEntry={!showPassword}
          editable={!disabled}
          style={[
            styles.input,
            hasError && styles.inputError,
            disabled && styles.inputDisabled,
            { color: theme.color.text, backgroundColor: theme.color.surface } as TextStyle,
          ] as const}
          selectionColor={theme.color.accent}
          inputMode={inputMode}
          autoComplete={autoComplete}
          maxLength={maxLength}
          accessibilityLabel={label}
          accessibilityInvalid={hasError}
          accessibilityState={{ disabled, invalid: hasError }}
          accessibilityDescribedBy={error ? 'error' : hint ? 'hint' : undefined}
        />
        {rightElement && !clearable && <View style={styles.elementRight}>{rightElement}</View>}
        {secureTextEntry && (
          <PressablePrimitive
            variant="ghost"
            size="sm"
            onPress={() => setShowPassword(!showPassword)}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            style={styles.passwordToggle}
          >
            <TextPrimitive variant="caption1" color={theme.color.muted}>
              {showPassword ? 'Hide' : 'Show'}
            </TextPrimitive>
          </PressablePrimitive>
        )}
        {clearable && value && (
          <PressablePrimitive
            variant="ghost"
            size="sm"
            onPress={handleClear}
            accessibilityLabel="Clear input"
            style={styles.clearButton}
          >
            <TextPrimitive variant="caption1" color={theme.color.muted}>✕</TextPrimitive>
          </PressablePrimitive>
        )}
      </View>
      {error ? (
        <Body id="error" style={{ color: theme.color.danger, fontSize: 13, marginTop: 6, role: 'alert' }}>
          {error}
        </Body>
      ) : hint && !error ? (
        <Body id="hint" style={{ color: theme.color.muted, fontSize: 13, marginTop: 6 }}>
          {hint}
        </Body>
      ) : showCharacterCount && maxLength ? (
        <Body style={{ color: theme.color.muted, fontSize: 13, marginTop: 6, textAlign: 'right' }}>
          {value.length} / {maxLength}
        </Body>
      ) : null}
    </View>
  );
});

InputInner.displayName = 'Input';

export const Input = InputInner;

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
  inputError: {
    borderColor: '#EF4444',
  },
  inputDisabled: {
    opacity: 0.38,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Barlow_500Medium',
    paddingVertical: 0,
  },
  elementLeft: { marginRight: 12 },
  elementRight: { marginLeft: 12 },
  passwordToggle: { paddingHorizontal: 8 },
  clearButton: { paddingHorizontal: 8, marginLeft: 8 },
});

export interface TextAreaProps extends Omit<TextInputProps, 'style' | 'onChangeText' | 'value' | 'multiline' | 'numberOfLines'> {
  label?: string;
  error?: string;
  hint?: string;
  rows?: number;
  style?: ViewStyle;
  value?: string;
  onChangeText?: (text: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  maxLength?: number;
  showCharacterCount?: boolean;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>((props, ref) => {
  const theme = useTheme();
  const {
    label,
    error,
    hint,
    rows = 4,
    style,
    value = '',
    onChangeText,
    onBlur,
    onFocus,
    maxLength,
    showCharacterCount = false,
    required = false,
    disabled = false,
    placeholder,
    ...rest
  } = props;

  const hasError = !!error;

  const handleBlur = () => onBlur?.();
  const handleFocus = () => onFocus?.();

  useImperativeHandle(ref, () => ({
    focus: () => {},
    blur: () => {},
  }));

  return (
    <View style={[{ marginBottom: 6 }, style]}>
      {(label || required) && (
        <Label style={{ marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {label}
          {required && <TextPrimitive variant="caption1" color={theme.color.danger}>*</TextPrimitive>}
        </Label>
      )}
      <View style={[styles.textAreaWrapper, hasError && styles.inputError]}>
        <TextInput
          {...rest}
          value={value}
          onChangeText={onChangeText}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          placeholderTextColor={theme.color.muted}
          multiline
          numberOfLines={rows}
          editable={!disabled}
          style={[
            styles.textArea,
            { color: theme.color.text, backgroundColor: theme.color.surface },
          ] as const}
          selectionColor={theme.color.accent}
          maxLength={maxLength}
          accessibilityLabel={label}
          accessibilityInvalid={hasError}
          accessibilityState={{ disabled, invalid: hasError }}
          accessibilityDescribedBy={error ? 'error' : hint ? 'hint' : undefined}
        />
      </View>
      {error ? (
        <Body id="error" style={{ color: theme.color.danger, fontSize: 13, marginTop: 6, role: 'alert' }}>
          {error}
        </Body>
      ) : hint && !error ? (
        <Body id="hint" style={{ color: theme.color.muted, fontSize: 13, marginTop: 6 }}>
          {hint}
        </Body>
      ) : showCharacterCount && maxLength ? (
        <Body style={{ color: theme.color.muted, fontSize: 13, marginTop: 6, textAlign: 'right' }}>
          {value.length} / {maxLength}
        </Body>
      ) : null}
    </View>
  );
});

TextArea.displayName = 'TextArea';

const textAreaStyles = StyleSheet.create({
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
  inputError: {
    borderColor: '#EF4444',
  },
});

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps {
  label?: string;
  error?: string;
  hint?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>((props, ref) => {
  const theme = useTheme();
  const { label, error, hint, value, options, onChange, disabled = false, required = false, placeholder, accessibilityLabel, style } = props;

  const hasError = !!error;
  const selectedOption = options.find((o) => o.value === value);
  const displayValue = selectedOption?.label ?? placeholder ?? 'Select...';

  const handlePress = () => {
    if (disabled) return;
    // In a real implementation, this would open a native picker or modal
    // For now, we'll just cycle through options for demo
    const currentIndex = options.findIndex((o) => o.value === value);
    const nextIndex = (currentIndex + 1) % options.length;
    onChange(options[nextIndex].value);
  };

  return (
    <View style={{ marginBottom: 6, ...style }}>
      {(label || required) && (
        <Label style={{ marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {label}
          {required && <TextPrimitive variant="caption1" color={theme.color.danger}>*</TextPrimitive>}
        </Label>
      )}
      <PressablePrimitive
        variant="secondary"
        size="md"
        disabled={disabled}
        onPress={handlePress}
        accessibilityRole="combobox"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled, invalid: hasError }}
        accessibilityValue={{ text: displayValue }}
        accessibilityExpanded={false}
        style={[
          styles.selectWrapper,
          hasError && styles.inputError,
          disabled && styles.inputDisabled,
          { backgroundColor: theme.color.surface, borderColor: theme.color.line },
        ]}
      >
        <TextPrimitive style={[styles.selectInput, { color: value ? theme.color.text : theme.color.muted }]}>
          {displayValue}
        </TextPrimitive>
        <TextPrimitive variant="caption1" color={theme.color.muted} style={styles.selectArrow}>
          ▼
        </TextPrimitive>
      </PressablePrimitive>
      {error ? (
        <Body id="error" style={{ color: theme.color.danger, fontSize: 13, marginTop: 6, role: 'alert' }}>
          {error}
        </Body>
      ) : hint && !error ? (
        <Body id="hint" style={{ color: theme.color.muted, fontSize: 13, marginTop: 6 }}>
          {hint}
        </Body>
      ) : null}
    </View>
  );
});

Select.displayName = 'Select';

const selectStyles = StyleSheet.create({
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
  inputError: {
    borderColor: '#EF4444',
  },
  inputDisabled: {
    opacity: 0.38,
  },
});

export interface ToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  hint?: string;
  variant?: 'switch' | 'checkbox';
  required?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function Toggle({
  label,
  value,
  onChange,
  disabled = false,
  hint,
  variant = 'switch',
  required = false,
  accessibilityLabel,
  style,
}: ToggleProps) {
  const theme = useTheme();

  if (variant === 'checkbox') {
    return (
      <PressablePrimitive
        variant="ghost"
        size="md"
        disabled={disabled}
        onPress={() => !disabled && onChange(!value)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: value, disabled, required }}
        accessibilityLabel={accessibilityLabel ?? label}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          minHeight: 48,
          paddingVertical: 4,
          opacity: disabled ? 0.38 : pressed ? 0.8 : 1,
          ...style,
        })}
      >
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
          {value && <TextPrimitive style={{ color: theme.color.accentInk, fontSize: 14, lineHeight: 14 }}>✓</TextPrimitive>}
        </View>
        <View style={{ flex: 1 }}>
          <Strong>{label}</Strong>
          {hint && <Body style={{ color: theme.color.muted, marginTop: 2 }}>{hint}</Body>}
        </View>
      </PressablePrimitive>
    );
  }

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 48, opacity: disabled ? 0.38 : 1, ...style }}>
      <View style={{ flex: 1 }}>
        <Strong>{label}</Strong>
        {hint && <Body style={{ color: theme.color.muted, marginTop: 2 }}>{hint}</Body>}
      </View>
      <PressablePrimitive
        variant="ghost"
        size="sm"
        disabled={disabled}
        onPress={() => !disabled && onChange(!value)}
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled, required }}
        accessibilityLabel={accessibilityLabel ?? label}
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
        })}
      >
        <Animated.View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: theme.color.text,
            marginLeft: value ? 20 : 2,
          }} />
      </PressablePrimitive>
    </View>
  );
}

import { Strong } from '../primitives/Text';

export interface StepperProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  suffix?: string;
  required?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function Stepper({
  label,
  value,
  min = 0,
  max = 99,
  step = 1,
  onChange,
  disabled = false,
  suffix,
  required = false,
  accessibilityLabel,
  style,
}: StepperProps) {
  const theme = useTheme();

  const canDecrement = value > min;
  const canIncrement = value < max;

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
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, ...style }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {(label || required) && (
          <Label style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {label}
            {required && <TextPrimitive variant="caption1" color={theme.color.danger}>*</TextPrimitive>}
          </Label>
        )}
        <PressablePrimitive
          variant="ghost"
          size="sm"
          disabled={disabled || !canDecrement}
          onPress={() => onChange(Math.max(min, value - step))}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ? `${accessibilityLabel}, decrease` : `Decrease ${label}`}
          accessibilityState={{ disabled: disabled || !canDecrement }}
          style={({ pressed }) => buttonStyle(disabled || !canDecrement, pressed)}>
          <TextPrimitive style={{ fontFamily: theme.type.uiStrong, color: theme.color.text, fontSize: 20 }}>−</TextPrimitive>
        </PressablePrimitive>
        <View style={{ minWidth: 60, alignItems: 'center' }}>
          <TextPrimitive variant="body1" weight="semibold">{value}{suffix ? ` ${suffix}` : ''}</TextPrimitive>
        </View>
        <PressablePrimitive
          variant="ghost"
          size="sm"
          disabled={disabled || !canIncrement}
          onPress={() => onChange(Math.min(max, value + step))}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ? `${accessibilityLabel}, increase` : `Increase ${label}`}
          accessibilityState={{ disabled: disabled || !canIncrement }}
          style={({ pressed }) => buttonStyle(disabled || !canIncrement, pressed)}>
          <TextPrimitive style={{ fontFamily: theme.type.uiStrong, color: theme.color.text, fontSize: 20 }}>+</TextPrimitive>
        </PressablePrimitive>
      </View>
    </View>
  );
}

export interface CheckboxProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  hint?: string;
  required?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function Checkbox({
  label,
  value,
  onChange,
  disabled = false,
  hint,
  required = false,
  accessibilityLabel,
  style,
}: CheckboxProps) {
  const theme = useTheme();

  return (
    <PressablePrimitive
      variant="ghost"
      size="md"
      disabled={disabled}
      onPress={() => !disabled && onChange(!value)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value, disabled, required }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 48,
        paddingVertical: 4,
        opacity: disabled ? 0.38 : pressed ? 0.8 : 1,
        ...style,
      })}
    >
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
        {value && <TextPrimitive style={{ color: theme.color.accentInk, fontSize: 14, lineHeight: 14 }}>✓</TextPrimitive>}
      </View>
      <View style={{ flex: 1 }}>
        <Strong>{label}</Strong>
        {hint && <Body style={{ color: theme.color.muted, marginTop: 2 }}>{hint}</Body>}
      </View>
    </PressablePrimitive>
  );
}

export interface RadioOption {
  label: string;
  value: string;
  hint?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  label?: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  direction?: 'row' | 'column';
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function RadioGroup({
  label,
  options,
  value,
  onChange,
  disabled = false,
  required = false,
  direction = 'column',
  accessibilityLabel,
  style,
}: RadioGroupProps) {
  const theme = useTheme();

  return (
    <View style={[{ marginBottom: 6, ...style }]}>
      {(label || required) && (
        <Label style={{ marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {label}
          {required && <TextPrimitive variant="caption1" color={theme.color.danger}>*</TextPrimitive>}
        </Label>
      )}
      <View style={{ flexDirection: direction, gap: direction === 'row' ? 16 : 8 }}>
        {options.map((option) => (
          <PressablePrimitive
            key={option.value}
            variant="ghost"
            size="md"
            disabled={disabled || option.disabled}
            onPress={() => !disabled && !option.disabled && onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: option.value === value, disabled: disabled || option.disabled, required }}
            accessibilityLabel={accessibilityLabel ?? option.label}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              minHeight: 44,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: theme.radius.md,
              backgroundColor: option.value === value ? theme.color.accent : pressed ? theme.color.surface2 : 'transparent',
              borderWidth: 1,
              borderColor: option.value === value ? theme.color.accent : theme.color.line,
              opacity: disabled || option.disabled ? 0.38 : 1,
            })}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: option.value === value ? theme.color.accent : theme.color.line,
                backgroundColor: option.value === value ? theme.color.accent : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              {option.value === value && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.color.accentInk }} />}
            </View>
            <View>
              <TextPrimitive variant="body1" weight="medium" color={option.value === value ? theme.color.accentInk : theme.color.text}>
                {option.label}
              </TextPrimitive>
              {option.hint && <TextPrimitive variant="caption1" color={theme.color.muted}>{option.hint}</TextPrimitive>}
            </View>
          </PressablePrimitive>
        ))}
      </View>
    </View>
  );
}