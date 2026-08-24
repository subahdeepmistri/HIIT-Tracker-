import React from 'react';
import { Text, type TextStyle, type TextProps } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

export type TypographyVariant =
  | 'display1' | 'display2' | 'display3'
  | 'headline1' | 'headline2' | 'headline3'
  | 'title1' | 'title2' | 'title3'
  | 'body1' | 'body2' | 'body3'
  | 'label1' | 'label2' | 'label3'
  | 'caption1' | 'caption2'
  | 'overline';

export interface TextPrimitiveProps extends Omit<TextProps, 'style'> {
  variant?: TypographyVariant;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  color?: string;
  style?: TextStyle;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  selectable?: boolean;
}

const variantStyles: Record<TypographyVariant, { fontSize: number; lineHeight: number; letterSpacing: number }> = {
  display1: { fontSize: 56, lineHeight: 60, letterSpacing: -1.2 },
  display2: { fontSize: 44, lineHeight: 48, letterSpacing: -0.8 },
  display3: { fontSize: 36, lineHeight: 40, letterSpacing: -0.6 },
  headline1: { fontSize: 32, lineHeight: 38, letterSpacing: -0.4 },
  headline2: { fontSize: 28, lineHeight: 34, letterSpacing: -0.2 },
  headline3: { fontSize: 24, lineHeight: 30, letterSpacing: 0 },
  title1: { fontSize: 22, lineHeight: 28, letterSpacing: 0 },
  title2: { fontSize: 20, lineHeight: 26, letterSpacing: 0.1 },
  title3: { fontSize: 18, lineHeight: 24, letterSpacing: 0.1 },
  body1: { fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  body2: { fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  body3: { fontSize: 12, lineHeight: 18, letterSpacing: 0.2 },
  label1: { fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
  label2: { fontSize: 12, lineHeight: 16, letterSpacing: 0.5 },
  label3: { fontSize: 11, lineHeight: 14, letterSpacing: 0.5 },
  caption1: { fontSize: 12, lineHeight: 16, letterSpacing: 0.3 },
  caption2: { fontSize: 11, lineHeight: 14, letterSpacing: 0.3 },
  overline: { fontSize: 10, lineHeight: 14, letterSpacing: 1.5 },
};

const weightMap = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export function TextPrimitive({
  variant = 'body1',
  weight = 'regular',
  color,
  style,
  numberOfLines,
  ellipsizeMode,
  selectable = false,
  children,
  ...rest
}: TextPrimitiveProps) {
  const theme = useTheme();
  const { fontSize, lineHeight, letterSpacing } = variantStyles[variant];

  const fontFamily = weight === 'bold' || weight === 'semibold'
    ? theme.type.uiStrong
    : weight === 'medium'
      ? theme.type.ui
      : theme.type.uiBook;

  const computedStyle: TextStyle = {
    fontFamily,
    fontSize,
    lineHeight,
    letterSpacing,
    fontWeight: weightMap[weight] as TextStyle['fontWeight'],
    color: color ?? theme.color.text,
  };

  return (
    <Text
      {...rest}
      style={[computedStyle, style]}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      selectable={selectable}
    >
      {children}
    </Text>
  );
}

export function Heading({
  children,
  level = 1,
  weight = 'bold',
  ...props
}: {
  children: React.ReactNode;
  level?: 1 | 2 | 3;
  weight?: 'medium' | 'semibold' | 'bold';
  style?: TextStyle;
} & Omit<TextPrimitiveProps, 'variant' | 'weight'>) {
  const variantMap = { 1: 'display3', 2: 'headline2', 3: 'title1' } as const;
  return <TextPrimitive variant={variantMap[level]} weight={weight} {...props}>{children}</TextPrimitive>;
}

export function Body({
  children,
  size = 'md',
  weight = 'regular',
  muted = false,
  ...props
}: {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  muted?: boolean;
  style?: TextStyle;
} & Omit<TextPrimitiveProps, 'variant' | 'weight' | 'color'>) {
  const variantMap = { sm: 'body3', md: 'body1', lg: 'body2' } as const;
  const theme = useTheme();
  return <TextPrimitive variant={variantMap[size]} weight={weight} color={muted ? theme.color.muted : undefined} {...props}>{children}</TextPrimitive>;
}

export function Label({
  children,
  size = 'md',
  weight = 'semibold',
  uppercase = true,
  ...props
}: {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  weight?: 'medium' | 'semibold' | 'bold';
  uppercase?: boolean;
  style?: TextStyle;
} & Omit<TextPrimitiveProps, 'variant' | 'weight'>) {
  const variantMap = { sm: 'label3', md: 'label2', lg: 'label1' } as const;
  return (
    <TextPrimitive
      variant={variantMap[size]}
      weight={weight}
      style={[{ textTransform: uppercase ? 'uppercase' : 'none' }, props.style]}
      {...props}
    >
      {children}
    </TextPrimitive>
  );
}

export function Caption({
  children,
  muted = true,
  ...props
}: {
  children: React.ReactNode;
  muted?: boolean;
  style?: TextStyle;
} & Omit<TextPrimitiveProps, 'variant' | 'color'>) {
  const theme = useTheme();
  return <TextPrimitive variant="caption1" color={muted ? theme.color.muted : undefined} {...props}>{children}</TextPrimitive>;
}

export function Overline({
  children,
  ...props
}: {
  children: React.ReactNode;
  style?: TextStyle;
} & Omit<TextPrimitiveProps, 'variant'>) {
  return <TextPrimitive variant="overline" {...props}>{children}</TextPrimitive>;
}

export function Strong({
  children,
  ...props
}: {
  children: React.ReactNode;
  style?: TextStyle;
} & Omit<TextPrimitiveProps, 'weight'>) {
  return <TextPrimitive weight="semibold" {...props}>{children}</TextPrimitive>;
}

export function Link({
  children,
  onPress,
  disabled = false,
  ...props
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: TextStyle;
} & Omit<TextPrimitiveProps, 'onPress'>) {
  const theme = useTheme();
  return (
    <Text
      {...props}
      onPress={onPress}
      accessibilityRole={onPress ? 'link' : undefined}
      accessibilityState={{ disabled }}
      style={[
        { color: disabled ? theme.color.muted : theme.color.accent, textDecorationLine: 'underline' },
        props.style,
      ]}
    >
      {children}
    </Text>
  );
}

export function MetricValue({
  value,
  unit,
  format,
  variant = 'display3',
  weight = 'bold',
  ...props
}: {
  value: string | number;
  unit?: string;
  format?: (value: string | number) => string;
  variant?: TypographyVariant;
  weight?: 'medium' | 'semibold' | 'bold';
  style?: TextStyle;
} & Omit<TextPrimitiveProps, 'variant' | 'weight' | 'children'>) {
  const formatted = format ? format(value) : String(value);
  const displayValue = unit ? `${formatted}${unit}` : formatted;
  return <TextPrimitive variant={variant} weight={weight} {...props}>{displayValue}</TextPrimitive>;
}