import React from 'react';
import { View, ScrollView, SafeAreaView, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Box } from '../primitives/Box';

export interface ContainerProps {
  children: React.ReactNode;
  fluid?: boolean;
  center?: boolean;
  style?: ViewStyle;
}

const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
};

export function Container({ children, fluid = false, center = true, style }: ContainerProps) {
  const theme = useTheme();

  return (
    <Box
      style={[
        {
          width: '100%',
          maxWidth: fluid ? '100%' : breakpoints.xl,
          paddingHorizontal: theme.space[20],
          alignSelf: center ? 'center' : 'auto',
        },
        style,
      ]}>
      {children}
    </Box>
  );
}

export interface ScreenProps {
  children: React.ReactNode;
  safeArea?: boolean;
  style?: ViewStyle;
}

export function Screen({ children, safeArea = true, style }: ScreenProps) {
  const theme = useTheme();

  const content = (
    <Box style={{ flex: 1, backgroundColor: theme.color.bg, ...style }}>{children}</Box>
  );

  if (safeArea) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.bg }}>{content}</SafeAreaView>;
  }

  return content;
}

export interface ScrollViewProps {
  children: React.ReactNode;
  horizontal?: boolean;
  showsScrollIndicator?: boolean;
  contentContainerStyle?: ViewStyle;
  style?: ViewStyle;
  onScroll?: (event: any) => void;
  refreshControl?: React.ReactNode;
}

export function ScrollViewComponent({ children, horizontal = false, showsScrollIndicator = false, contentContainerStyle, style, onScroll, refreshControl }: ScrollViewProps) {
  return (
    <ScrollView
      horizontal={horizontal}
      showsHorizontalScrollIndicator={horizontal && showsScrollIndicator}
      showsVerticalScrollIndicator={!horizontal && showsScrollIndicator}
      contentContainerStyle={contentContainerStyle}
      style={style}
      onScroll={onScroll}
      refreshControl={refreshControl as any}>
      {children}
    </ScrollView>
  );
}

export interface GridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  gap?: number;
  responsive?: boolean;
  style?: ViewStyle;
}

export function Grid({ children, columns = 12, gap = 16, responsive = true, style }: GridProps) {
  const theme = useTheme();
  const childrenArray = React.Children.toArray(children).filter((c): c is React.ReactElement => React.isValidElement(c));

  return (
    <Box flexDirection="row" flexWrap="wrap" gap={gap} style={style}>
      {childrenArray.map((child, index) => {
        const childProps = child.props as any;
        const colSpan = childProps.span || Math.floor(12 / columns);
        const width = `${(colSpan / 12) * 100}%`;

        return (
          <View key={child.key ?? index} style={{ width, minWidth: responsive ? 280 : 0, flexShrink: 1 }}>
            {React.cloneElement(child, { style: { width: '100%', ...childProps.style } })}
          </View>
        );
      })}
    </Box>
  );
}

export interface GridItemProps {
  children: React.ReactNode;
  span?: number;
  offset?: number;
  order?: number;
  style?: ViewStyle;
}

export function GridItem({ children, span = 1, offset = 0, order, style }: GridItemProps) {
  const width = `${(span / 12) * 100}%`;
  const marginLeft = offset > 0 ? `${(offset / 12) * 100}%` : 0;

  return (
    <Box style={{ width, marginLeft, order, ...style }}>{children}</Box>
  );
}

export interface FlexProps extends Omit<Box, 'flexDirection'> {
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  wrap?: 'wrap' | 'nowrap' | 'wrap-reverse';
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  gap?: number;
}

export function FlexComponent({ children, direction = 'column', wrap = 'nowrap', align = 'stretch', justify = 'flex-start', gap = 0, style, ...props }: FlexProps) {
  return (
    <Box
      flexDirection={direction}
      flexWrap={wrap}
      alignItems={align}
      justifyContent={justify}
      gap={gap}
      style={style}
      {...props}>
      {children}
    </Box>
  );
}

export interface StackProps {
  children: React.ReactNode;
  space?: number;
  direction?: 'row' | 'column';
  divider?: React.ReactNode;
  style?: ViewStyle;
}

export function StackComponent({ children, space = 16, direction = 'column', divider, style }: StackProps) {
  const theme = useTheme();
  const spaceValue = typeof space === 'number' ? space : theme.space[space as keyof typeof theme.space] ?? space;

  const childrenArray = React.Children.toArray(children).filter((c): c is React.ReactElement => React.isValidElement(c));

  return (
    <Box flexDirection={direction} gap={spaceValue} style={style}>
      {childrenArray.map((child, index) => (
        <React.Fragment key={child.key ?? index}>
          {child}
          {divider && index < childrenArray.length - 1 && divider}
        </React.Fragment>
      ))}
    </Box>
  );
}

export interface InlineProps {
  children: React.ReactNode;
  space?: number;
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  wrap?: boolean;
  style?: ViewStyle;
}

export function Inline({ children, space = 8, align = 'center', wrap = true, style }: InlineProps) {
  const theme = useTheme();
  const spaceValue = typeof space === 'number' ? space : theme.space[space as keyof typeof theme.space] ?? space;

  return (
    <Box flexDirection="row" flexWrap={wrap ? 'wrap' : 'nowrap'} alignItems={align} gap={spaceValue} style={style}>
      {children}
    </Box>
  );
}

export interface CenterProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CenterComponent({ children, style }: CenterProps) {
  return <Box alignItems="center" justifyContent="center" style={style}>{children}</Box>;
}

export interface AbsoluteFillProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function AbsoluteFillComponent({ children, style }: AbsoluteFillProps) {
  return <Box position="absolute" top={0} right={0} bottom={0} left={0} style={style}>{children}</Box>;
}

export interface AspectRatioProps {
  children: React.ReactNode;
  ratio: number;
  style?: ViewStyle;
}

export function AspectRatio({ children, ratio, style }: AspectRatioProps) {
  return (
    <View style={{ position: 'relative', width: '100%', ...style }}>
      <View style={{ width: '100%', aspectRatio: ratio }}>
        {typeof children === 'function' ? children({ width: '100%', height: '100%' }) : children}
      </View>
    </View>
  );
}

export interface MediaProps {
  src: string;
  alt?: string;
  aspectRatio?: number;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  borderRadius?: number;
  style?: ViewStyle;
}

export function Media({ src, alt, aspectRatio = 16 / 9, objectFit = 'cover', borderRadius, style }: MediaProps) {
  return (
    <View style={{ width: '100%', aspectRatio, borderRadius, overflow: 'hidden', ...style }}>
      <View style={{ flex: 1, backgroundColor: '#2A3140' }} />
    </View>
  );
}

export interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  variant?: 'solid' | 'dashed' | 'dotted';
  color?: string;
  thickness?: number;
  style?: ViewStyle;
}

export function Separator({ orientation = 'horizontal', variant = 'solid', color, thickness = 1, style }: SeparatorProps) {
  const theme = useTheme();
  const separatorColor = color ?? theme.color.line;

  return (
    <View
      style={{
        borderStyle: variant,
        ...(orientation === 'horizontal'
          ? { borderBottomWidth: thickness, width: '100%' }
          : { borderRightWidth: thickness, height: '100%' }),
        borderColor: separatorColor,
        opacity: 0.5,
        ...style,
      }}
    />
  );
}

export interface SpacerProps {
  size?: number | keyof typeof import('../../theme/tokens').space;
  style?: ViewStyle;
}

export function Spacer({ size = 16, style }: SpacerProps) {
  const theme = useTheme();
  const spaceValue = typeof size === 'number' ? size : theme.space[size as keyof typeof theme.space] ?? size;
  return <View style={{ height: spaceValue, width: spaceValue, ...style }} />;
}

export interface VisuallyHiddenProps {
  children: React.ReactNode;
}

export function VisuallyHidden({ children }: VisuallyHiddenProps) {
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-desktop"
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}>
      {children}
    </View>
  );
}