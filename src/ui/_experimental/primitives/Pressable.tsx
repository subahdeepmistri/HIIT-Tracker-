import React from 'react';
import { Pressable, type PressableProps, type ViewStyle, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Box } from './Box';

export interface PressablePrimitiveProps extends Omit<PressableProps, 'style' | 'children'> {
  children: React.ReactNode | ((pressed: boolean) => React.ReactNode);
  style?: ViewStyle | ((pressed: boolean) => ViewStyle);
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'rest' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  haptic?: 'light' | 'medium' | 'heavy' | 'none';
  accessibilityRole?: 'button' | 'link' | 'menuitem' | 'tab' | 'checkbox' | 'switch' | 'radio';
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const variantStyles = (theme: ReturnType<typeof useTheme>) => ({
  primary: {
    backgroundColor: theme.color.accent,
    borderColor: 'transparent',
    color: theme.color.accentInk,
  },
  secondary: {
    backgroundColor: theme.color.surface2,
    borderColor: theme.color.line,
    color: theme.color.text,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    color: theme.color.accent,
  },
  danger: {
    backgroundColor: theme.color.danger,
    borderColor: 'transparent',
    color: '#FFFFFF',
  },
  rest: {
    backgroundColor: theme.color.rest,
    borderColor: 'transparent',
    color: theme.color.restInk,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: theme.color.accent,
    color: theme.color.accent,
  },
});

const sizeTokens = (theme: ReturnType<typeof useTheme>) => ({
  sm: { height: 36, paddingHorizontal: 12, fontSize: 13, borderRadius: theme.radius.md, minWidth: 36 },
  md: { height: 48, paddingHorizontal: 20, fontSize: 16, borderRadius: theme.radius.md, minWidth: 48 },
  lg: { height: 56, paddingHorizontal: 24, fontSize: 18, borderRadius: theme.radius.lg, minWidth: 56 },
});

export function PressablePrimitive({
  children,
  style,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  haptic = 'light',
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityHint,
  onPress,
  onPressIn,
  onPressOut,
  onLongPress,
  ...rest
}: PressablePrimitiveProps) {
  const theme = useTheme();
  const v = variantStyles(theme)[variant];
  const s = sizeTokens(theme)[size];
  const isDisabled = disabled || loading;

  const baseStyle: ViewStyle = {
    height: s.height,
    paddingHorizontal: s.paddingHorizontal,
    borderRadius: s.borderRadius,
    borderWidth: variant === 'outline' || variant === 'ghost' ? 1 : 0,
    borderColor: v.borderColor,
    backgroundColor: v.backgroundColor,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    minWidth: s.minWidth,
    width: fullWidth ? '100%' : undefined,
    opacity: isDisabled ? 0.45 : 1,
  };

  const resolvedStyle = typeof style === 'function' ? style(false) : style;

  const handlePressIn = (event: React.GestureResponderEvent) => {
    if (!isDisabled && haptic !== 'none') {
      const { Haptics } = require('expo-haptics');
      const impactStyle = haptic === 'light' ? Haptics.ImpactFeedbackStyle.Light
        : haptic === 'medium' ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Heavy;
      Haptics.impactAsync(impactStyle);
    }
    onPressIn?.(event);
  };

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={onPressOut}
      onLongPress={onLongPress}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, loading }}
      style={({ pressed }) => [
        baseStyle,
        pressed && !isDisabled && { opacity: 0.82 },
        resolvedStyle,
      ]}
    >
      {loading ? (
        <React.Fragment>
          {Platform.OS === 'web' ? (
            <span style={{ width: 20, height: 20, border: `2px solid ${v.color}`, borderRightColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          ) : (
            <Box
              style={{
                width: 20,
                height: 20,
                borderWidth: 2,
                borderColor: v.color,
                borderRightColor: 'transparent',
                borderRadius: 10,
              }}
            />
          )}
        </React.Fragment>
      ) : typeof children === 'function' ? (
        children(false)
      ) : (
        children
      )}
    </Pressable>
  );
}

export function Button({
  children,
  label,
  iconStart,
  iconEnd,
  ...props
}: {
  children?: React.ReactNode;
  label?: string;
  iconStart?: React.ReactNode;
  iconEnd?: React.ReactNode;
} & PressablePrimitiveProps) {
  const theme = useTheme();
  const v = variantStyles(theme)[props.variant ?? 'primary'];
  const s = sizeTokens(theme)[props.size ?? 'md'];

  const content = (
    <React.Fragment>
      {iconStart}
      {label ? (
        <TextPrimitive
          style={{
            fontFamily: theme.type.uiStrong,
            color: v.color,
            fontSize: s.fontSize,
            textAlign: 'center',
          }}
        >
          {label}
        </TextPrimitive>
      ) : (
        children
      )}
      {iconEnd}
    </React.Fragment>
  );

  return <PressablePrimitive {...props}>{content}</PressablePrimitive>;
}

import { TextPrimitive } from './Text';

export function IconButton({
  name,
  label,
  onPress,
  color,
  size = 'md',
  disabled = false,
  loading = false,
  accessibilityLabel,
  accessibilityHint,
  ...props
}: {
  name: string;
  label: string;
  onPress?: () => void;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const s = sizeTokens(theme)[size];

  return (
    <PressablePrimitive
      variant="ghost"
      size={size}
      disabled={disabled}
      loading={loading}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      style={[{ minWidth: s.height, minHeight: s.height, padding: 0 }, props.style]}
    >
      {loading ? null : (
        <Box
          as="view"
          style={{
            width: 24,
            height: 24,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {typeof name === 'string' && name.startsWith('icon-') ? (
            <Box style={{ width: 24, height: 24 }}>{name}</Box>
          ) : (
            <TextPrimitive style={{ fontSize: 22, color: color ?? theme.color.text }}>{name}</TextPrimitive>
          )}
        </Box>
      )}
    </PressablePrimitive>
  );
}

export function TouchableArea({
  children,
  onPress,
  onLongPress,
  disabled = false,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityHint,
  hitSlop = 12,
  ...props
}: {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  accessibilityRole?: PressablePrimitiveProps['accessibilityRole'];
  accessibilityLabel?: string;
  accessibilityHint?: string;
  hitSlop?: number | { top: number; right: number; bottom: number; left: number };
} & Omit<PressablePrimitiveProps, 'children' | 'style' | 'variant' | 'size' | 'loading'>) {
  return (
    <PressablePrimitive
      variant="ghost"
      style={{ padding: 0 }}
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      hitSlop={hitSlop}
      {...props}
    >
      {children}
    </PressablePrimitive>
  );
}