import React from 'react';
import { View, Pressable, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Box } from '../primitives/Box';
import { TextPrimitive } from '../primitives/Text';

export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'outlined' | 'elevated' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onPress?: () => void;
  accent?: boolean;
  bordered?: boolean;
}

const paddingMap = { none: 0, sm: 12, md: 16, lg: 24 };

export function Card({
  children,
  style,
  variant = 'default',
  padding = 'md',
  interactive = false,
  onPress,
  accent = false,
  bordered = true,
}: CardProps) {
  const theme = useTheme();
  const pad = paddingMap[padding];

  let backgroundColor = theme.color.surface;
  let borderColor = theme.color.line;
  let borderWidth = bordered ? StyleSheet.hairlineWidth : 0;
  let elevation = {};

  switch (variant) {
    case 'outlined':
      backgroundColor = 'transparent';
      borderWidth = 1;
      borderColor = accent ? theme.color.accent : theme.color.line;
      break;
    case 'elevated':
      backgroundColor = theme.color.surface;
      borderWidth = 0;
      elevation = {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
      };
      break;
    case 'filled':
      backgroundColor = theme.color.surface2;
      borderWidth = 0;
      break;
    default:
      backgroundColor = theme.color.surface;
      borderWidth = bordered ? StyleSheet.hairlineWidth : 0;
      borderColor = accent ? theme.color.accent : theme.color.line;
  }

  const content = (
    <View
      style={{
        backgroundColor,
        borderRadius: theme.radius.lg,
        borderWidth,
        borderColor,
        padding: pad,
        ...elevation,
        ...style,
      }}>
      {children}
    </View>
  );

  if (interactive && onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, style]}>
        {content}
      </Pressable>
    );
  }

  return content;
}

export interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  style?: ViewStyle;
}

export function CardHeader({ title, subtitle, action, style }: CardHeaderProps) {
  const theme = useTheme();
  return (
    <Box flexDirection="row" alignItems="flex-start" justifyContent="space-between" gap={12} style={style}>
      <Box flex={1} gap={4}>
        <TextPrimitive variant="title3" weight="semibold">{title}</TextPrimitive>
        {subtitle && <TextPrimitive variant="body2" color={theme.color.muted}>{subtitle}</TextPrimitive>}
      </Box>
      {action}
    </Box>
  );
}

export interface CardContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardContent({ children, style }: CardContentProps) {
  return <Box style={style}>{children}</Box>;
}

export interface CardFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
  divided?: boolean;
}

export function CardFooter({ children, style, divided = true }: CardFooterProps) {
  const theme = useTheme();
  return (
    <Box
      style={[
        { paddingTop: 12, borderTopWidth: divided ? StyleSheet.hairlineWidth : 0, borderTopColor: theme.color.line },
        style,
      ]}>
      {children}
    </Box>
  );
}

export interface CardMediaProps {
  source: { uri: string } | number;
  alt?: string;
  aspectRatio?: number;
  style?: ViewStyle;
}

export function CardMedia({ source, alt, aspectRatio = 16 / 9, style }: CardMediaProps) {
  return (
    <View style={{ width: '100%', aspectRatio, borderRadius: 0, overflow: 'hidden', ...style }}>
      {typeof source === 'number' ? (
        <View style={{ flex: 1, backgroundColor: '#2A3140' }} />
      ) : (
        <View style={{ flex: 1 }} />
      )}
    </View>
  );
}

export interface CardListProps {
  items: Array<{
    title: string;
    subtitle?: string;
    leading?: React.ReactNode;
    trailing?: React.ReactNode;
    onPress?: () => void;
    disabled?: boolean;
  }>;
  divided?: boolean;
  style?: ViewStyle;
}

export function CardList({ items, divided = true, style }: CardListProps) {
  const theme = useTheme();

  return (
    <Box style={style}>
      {items.map((item, index) => (
        <Pressable
          key={index}
          onPress={item.onPress}
          disabled={item.disabled}
          accessibilityRole={item.onPress ? 'button' : undefined}
          accessibilityState={{ disabled: item.disabled }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            paddingHorizontal: 0,
            gap: 12,
            backgroundColor: pressed && item.onPress ? theme.color.surface2 : 'transparent',
            borderBottomWidth: divided && index < items.length - 1 ? StyleSheet.hairlineWidth : 0,
            borderBottomColor: theme.color.line,
            opacity: item.disabled ? 0.5 : 1,
          })}>
          {item.leading && <Box style={{ flexShrink: 0 }}>{item.leading}</Box>}
          <Box flex={1} gap={2} minWidth={0}>
            <TextPrimitive variant="body1" weight="medium" numberOfLines={1}>{item.title}</TextPrimitive>
            {item.subtitle && <TextPrimitive variant="caption1" color={theme.color.muted} numberOfLines={1}>{item.subtitle}</TextPrimitive>}
          </Box>
          {item.trailing && <Box style={{ flexShrink: 0 }}>{item.trailing}</Box>}
        </Pressable>
      ))}
    </Box>
  );
}