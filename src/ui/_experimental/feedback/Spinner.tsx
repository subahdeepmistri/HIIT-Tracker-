import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Platform, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Box } from '../primitives/Box';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  thickness?: number;
  speed?: number;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

const sizeMap = { sm: 20, md: 32, lg: 48 };
const thicknessMap = { sm: 2, md: 3, lg: 4 };

export function Spinner({ size = 'md', color, thickness, speed = 800, accessibilityLabel = 'Loading', style }: SpinnerProps) {
  const theme = useTheme();
  const diameter = sizeMap[size];
  const strokeWidth = thickness ?? thicknessMap[size];
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animatedValue.setValue(0);
    const animation = Animated.timing(animatedValue, {
      toValue: 1,
      duration: speed,
      easing: (t) => t,
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (finished) animatedValue.setValue(0);
    });
    return () => animation.stop();
  }, [speed]);

  const rotate = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const strokeDasharray = Math.PI * (diameter - strokeWidth);
  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [strokeDasharray, strokeDasharray * 0.25, 0],
  });

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: 'Loading' }}
      style={{ width: diameter, height: diameter, ...style }}>
      {Platform.OS === 'web' ? (
        <svg width={diameter} height={diameter} style={{ transform: [{ rotate }] }}>
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={(diameter - strokeWidth) / 2}
            fill="none"
            stroke={theme.color.surface2}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={(diameter - strokeWidth) / 2}
            fill="none"
            stroke={color ?? theme.color.accent}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            style={{
              transformOrigin: 'center',
              transform: [{ rotate: '-90deg' }],
            }}
          />
        </svg>
      ) : (
        <View style={{ width: diameter, height: diameter, borderRadius: diameter / 2, borderWidth: strokeWidth, borderColor: theme.color.surface2 }}>
          <Animated.View
            style={{
              position: 'absolute',
              top: -strokeWidth,
              left: -strokeWidth,
              width: diameter + strokeWidth * 2,
              height: diameter + strokeWidth * 2,
              borderRadius: (diameter + strokeWidth * 2) / 2,
              borderWidth: strokeWidth,
              borderColor: color ?? theme.color.accent,
              borderTopColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: 'transparent',
              transform: [{ rotate }],
            }}
          />
        </View>
      )}
    </View>
  );
}

export interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export function LoadingOverlay({ visible, message, size = 'md', style }: LoadingOverlayProps) {
  if (!visible) return null;

  const theme = useTheme();

  return (
    <Box
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.color.overlay,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        ...style,
      }}>
      <Box style={{ backgroundColor: theme.color.surface, borderRadius: theme.radius.lg, padding: 24, gap: 12, alignItems: 'center' }}>
        <Spinner size={size} />
        {message && <TextPrimitive variant="body1" color={theme.color.muted}>{message}</TextPrimitive>}
      </Box>
    </Box>
  );
}

import { TextPrimitive } from '../primitives/Text';

export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'avatar';
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
  animation?: 'pulse' | 'wave' | 'none';
  style?: ViewStyle;
}

const skeletonStyles = StyleSheet.create({
  base: {
    backgroundColor: '#2A3140',
    overflow: 'hidden',
  },
  pulse: {
    // pulse animation handled by animated value
  },
});

export function Skeleton({ variant = 'text', width = '100%', height, borderRadius, animation = 'pulse', style }: SkeletonProps) {
  const theme = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animation === 'pulse') {
      animatedValue.setValue(0);
      Animated.loop(
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          easing: (t) => t,
          useNativeDriver: false,
        })
      ).start();
    } else if (animation === 'wave') {
      animatedValue.setValue(-1);
      Animated.loop(
        Animated.timing(animatedValue, {
          toValue: 2,
          duration: 1500,
          easing: (t) => t,
          useNativeDriver: false,
        })
      ).start();
    }
  }, [animation]);

  let computedBorderRadius: number;
  let computedHeight: number | string;
  let computedWidth: number | string;

  switch (variant) {
    case 'circular':
      computedBorderRadius = borderRadius ?? (typeof width === 'number' ? width / 2 : 50);
      computedHeight = height ?? width;
      computedWidth = width;
      break;
    case 'avatar':
      computedBorderRadius = borderRadius ?? 999;
      computedHeight = height ?? 40;
      computedWidth = width ?? 40;
      break;
    case 'rectangular':
      computedBorderRadius = borderRadius ?? theme.radius.md;
      computedHeight = height ?? 120;
      computedWidth = width;
      break;
    case 'text':
    default:
      computedBorderRadius = borderRadius ?? theme.radius.sm;
      computedHeight = height ?? 16;
      computedWidth = width;
      break;
  }

  const baseStyle: ViewStyle = {
    width: computedWidth,
    height: computedHeight,
    borderRadius: computedBorderRadius,
    backgroundColor: theme.color.surface2,
    overflow: 'hidden',
  };

  if (animation === 'pulse') {
    const opacity = animatedValue.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.4, 1, 0.4],
    });
    return (
      <Animated.View style={[baseStyle, { opacity }, style]} />
    );
  }

  if (animation === 'wave') {
    const waveWidth = typeof computedWidth === 'number' ? computedWidth : 200;
    const translateX = animatedValue.interpolate({
      inputRange: [-1, 0, 1, 2],
      outputRange: [-waveWidth, 0, waveWidth, waveWidth * 2],
    });
    return (
      <View style={[{ ...baseStyle, overflow: 'hidden' }, style]}>
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255,255,255,0.1)',
            transform: [{ translateX }],
          }}
        />
      </View>
    );
  }

  return <View style={[baseStyle, style]} />;
}

export interface SkeletonTextProps {
  lines?: number;
  lineHeight?: number;
  spacing?: number;
  lastLineWidth?: string | number;
  style?: ViewStyle;
}

export function SkeletonText({ lines = 3, lineHeight = 16, spacing = 8, lastLineWidth = '60%', style }: SkeletonTextProps) {
  return (
    <Box gap={spacing} style={style}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? lastLineWidth : '100%'}
          height={lineHeight}
          animation="wave"
        />
      ))}
    </Box>
  );
}

export interface SkeletonCardProps {
  title?: boolean;
  subtitle?: boolean;
  avatar?: boolean;
  action?: boolean;
  lines?: number;
  style?: ViewStyle;
}

export function SkeletonCard({ title = true, subtitle = true, avatar = true, action = true, lines = 3, style }: SkeletonCardProps) {
  const theme = useTheme();

  return (
    <Box style={{ backgroundColor: theme.color.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.color.line, padding: theme.space[20], gap: 12, ...style }}>
      <Box flexDirection="row" alignItems="center" gap={12}>
        {avatar && <Skeleton variant="avatar" size="md" animation="wave" />}
        <Box flex={1} gap={8}>
          {title && <Skeleton variant="text" width="60%" animation="wave" />}
          {subtitle && <Skeleton variant="text" width="40%" animation="wave" />}
        </Box>
        {action && <Skeleton variant="rectangular" width={80} height={36} borderRadius={theme.radius.md} animation="wave" />}
      </Box>
      <SkeletonText lines={lines} animation="wave" />
    </Box>
  );
}

export interface SkeletonListProps {
  itemCount?: number;
  item?: React.ReactNode;
  style?: ViewStyle;
}

export function SkeletonList({ itemCount = 5, item, style }: SkeletonListProps) {
  return (
    <Box gap={12} style={style}>
      {Array.from({ length: itemCount }, (_, i) => (
        <Box key={i} style={{ minHeight: 60 }}>
          {item ?? <SkeletonCard />}
        </Box>
      ))}
    </Box>
  );
}