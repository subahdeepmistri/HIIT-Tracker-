import React from 'react';
import { View, Pressable, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Box } from '../primitives/Box';
import { TextPrimitive } from '../primitives/Text';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warn' | 'danger' | 'info' | 'outline';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  dotColor?: string;
  removable?: boolean;
  onRemove?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const variantColors: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  default: { bg: 'surface2', color: 'text', border: 'transparent' },
  primary: { bg: 'accent', color: 'accentInk', border: 'transparent' },
  success: { bg: 'success', color: '#FFFFFF', border: 'transparent' },
  warn: { bg: 'warn', color: '#FFFFFF', border: 'transparent' },
  danger: { bg: 'danger', color: '#FFFFFF', border: 'transparent' },
  info: { bg: 'info', color: '#FFFFFF', border: 'transparent' },
  outline: { bg: 'transparent', color: 'accent', border: 'accent' },
};

const sizeTokens = (theme: ReturnType<typeof useTheme>) => ({
  sm: { paddingHorizontal: 6, paddingVertical: 2, fontSize: 10, borderRadius: theme.radius.sm, gap: 4, dotSize: 5 },
  md: { paddingHorizontal: 8, paddingVertical: 3, fontSize: 11, borderRadius: theme.radius.sm, gap: 5, dotSize: 6 },
  lg: { paddingHorizontal: 10, paddingVertical: 4, fontSize: 12, borderRadius: theme.radius.md, gap: 6, dotSize: 7 },
});

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  dotColor,
  removable = false,
  onRemove,
  style,
  textStyle,
}: BadgeProps) {
  const theme = useTheme();
  const colors = variantColors[variant];
  const tokens = sizeTokens(theme)[size];

  const bgColor = theme.color[colors.bg as keyof typeof theme.color] ?? colors.bg;
  const textColor = theme.color[colors.color as keyof typeof theme.color] ?? colors.color;
  const borderColor = theme.color[colors.border as keyof typeof theme.color] ?? colors.border;

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      gap={tokens.gap}
      style={[
        {
          paddingHorizontal: tokens.paddingHorizontal,
          paddingVertical: tokens.paddingVertical,
          borderRadius: tokens.borderRadius,
          backgroundColor: bgColor,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor,
        },
        style,
      ]}>
      {dot && (
        <View
          style={{
            width: tokens.dotSize,
            height: tokens.dotSize,
            borderRadius: tokens.dotSize / 2,
            backgroundColor: dotColor ?? textColor,
          }}
        />
      )}
      <TextPrimitive variant="label2" weight="semibold" color={textColor} style={textStyle}>
        {children}
      </TextPrimitive>
      {removable && (
        <Pressable
          onPress={onRemove}
          accessibilityLabel="Remove"
          style={{ padding: 2, marginLeft: 2, marginRight: -tokens.paddingHorizontal / 2 }}>
        <TextPrimitive variant="caption1" color={textColor} style={{ opacity: 0.7 }}>✕</TextPrimitive>
        </Pressable>
      )}
    </Box>
  );
}

export interface BadgeGroupProps {
  badges: Array<{ label: string; variant?: BadgeVariant; onPress?: () => void }>;
  maxVisible?: number;
  size?: BadgeSize;
  style?: ViewStyle;
}

export function BadgeGroup({ badges, maxVisible = 3, size = 'md', style }: BadgeGroupProps) {
  const visibleBadges = badges.slice(0, maxVisible);
  const remaining = badges.length - maxVisible;

  return (
    <Box flexDirection="row" flexWrap="wrap" gap={6} style={style}>
      {visibleBadges.map((badge, index) => (
        <Badge key={index} variant={badge.variant} size={size} onPress={badge.onPress}>
          {badge.label}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="outline" size={size}>
          +{remaining}
        </Badge>
      )}
    </Box>
  );
}

export interface StatusBadgeProps {
  status: 'idle' | 'loading' | 'success' | 'error' | 'warning' | 'active' | 'inactive';
  label?: string;
  size?: BadgeSize;
  animated?: boolean;
  style?: ViewStyle;
}

export function StatusBadge({ status, label, size = 'md', animated = false, style }: StatusBadgeProps) {
  const theme = useTheme();

  const statusConfig: Record<string, { variant: BadgeVariant; dot: boolean; dotColor?: string; icon?: string }> = {
    idle: { variant: 'default', dot: true, dotColor: theme.color.muted },
    loading: { variant: 'info', dot: true, dotColor: theme.color.info },
    success: { variant: 'success', dot: true, dotColor: theme.color.success },
    error: { variant: 'danger', dot: true, dotColor: theme.color.danger },
    warning: { variant: 'warn', dot: true, dotColor: theme.color.warn },
    active: { variant: 'primary', dot: true, dotColor: theme.color.accent },
    inactive: { variant: 'default', dot: true, dotColor: theme.color.muted },
  };

  const config = statusConfig[status] ?? statusConfig.idle;

  return (
    <Badge variant={config.variant} size={size} dot={config.dot} dotColor={config.dotColor} style={style}>
      {label ?? status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export interface TagProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Tag({ label, variant = 'default', size = 'md', onPress, disabled = false, style }: TagProps) {
  const theme = useTheme();
  const colors = variantColors[variant];
  const tokens = sizeTokens(theme)[size];

  const bgColor = theme.color[colors.bg as keyof typeof theme.color] ?? colors.bg;
  const textColor = theme.color[colors.color as keyof typeof theme.color] ?? colors.color;
  const borderColor = theme.color[colors.border as keyof typeof theme.color] ?? colors.border;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          {
            paddingHorizontal: tokens.paddingHorizontal,
            paddingVertical: tokens.paddingVertical,
            borderRadius: tokens.borderRadius,
            backgroundColor: disabled ? theme.color.surface2 : bgColor,
            borderWidth: variant === 'outline' ? 1 : 0,
            borderColor: disabled ? theme.color.line : borderColor,
            opacity: disabled ? 0.38 : pressed ? 0.8 : 1,
          },
          style,
        ]}>
        <TextPrimitive variant="label2" weight="semibold" color={disabled ? theme.color.muted : textColor}>{label}</TextPrimitive>
      </Pressable>
    );
  }

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      style={[
        {
          paddingHorizontal: tokens.paddingHorizontal,
          paddingVertical: tokens.paddingVertical,
          borderRadius: tokens.borderRadius,
          backgroundColor: disabled ? theme.color.surface2 : bgColor,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: disabled ? theme.color.line : borderColor,
          opacity: disabled ? 0.38 : 1,
        },
        style,
      ]}>
      <TextPrimitive variant="label2" weight="semibold" color={disabled ? theme.color.muted : textColor}>{label}</TextPrimitive>
    </Box>
  );
}