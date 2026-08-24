import React from 'react';
import { View, StyleSheet, Animated, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Body, Label, Strong, TextPrimitive } from '../primitives/Text';
import { Box } from '../primitives/Box';

export interface ProgressBarProps {
  label?: string;
  value: number | null;
  detail?: string;
  caption?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showDetail?: boolean;
  showOverflow?: boolean;
  showAsRecordedOnly?: boolean;
  animated?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function ProgressBar({
  label,
  value,
  detail,
  caption,
  color,
  size = 'md',
  showLabel = true,
  showDetail = true,
  showOverflow = true,
  showAsRecordedOnly = false,
  animated = true,
  accessibilityLabel,
  style,
}: ProgressBarProps) {
  const theme = useTheme();
  const hasValue = value != null && Number.isFinite(value);
  const fill = hasValue ? Math.min(1, Math.max(0, value)) : 0;
  const overflow = hasValue && value > 1 && showOverflow;
  const isRecordedOnly = showAsRecordedOnly === true;

  const trackHeight = size === 'sm' ? 6 : size === 'lg' ? 16 : 12;
  const labelFontSize = size === 'sm' ? 11 : size === 'lg' ? 14 : 13;
  const detailFontSize = size === 'sm' ? 11 : size === 'lg' ? 13 : 13;
  const captionFontSize = size === 'sm' ? 10 : size === 'lg' ? 13 : 13;
  const gap = size === 'sm' ? 4 : size === 'lg' ? 8 : 6;

  const animatedFill = useRef(new Animated.Value(0)).current;
  const [prevFill, setPrevFill] = React.useState(fill);

  React.useEffect(() => {
    if (animated) {
      Animated.timing(animatedFill, {
        toValue: fill,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      animatedFill.setValue(fill);
    }
    setPrevFill(fill);
  }, [fill, animated]);

  const fillWidth = animated ? animatedFill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) : `${fill * 100}%`;

  return (
    <View style={{ gap, ...style }} accessible accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel ?? `${label ?? 'Progress'} ${detail ?? ''}${caption ? ` ${caption}` : ''}`} accessibilityValue={hasValue ? { min: 0, max: 100, now: Math.round(Math.min(1, value!) * 100) } : { text: 'Not enough data' }}>
      {(showLabel || showDetail) && label && (
        <Box flexDirection="row" justifyContent="space-between" alignItems="baseline" gap={12}>
          {showLabel && <Label style={{ fontSize: labelFontSize }}>{label}</Label>}
          {showDetail && <Strong style={{ fontSize: detailFontSize, color: hasValue ? theme.color.text : theme.color.muted }}>{detail ?? (hasValue ? `${Math.round(fill * 100)}%` : 'Not enough data')}</Strong>}
        </Box>
      )}
      <View style={styles.trackContainer}>
        <View
          style={[
            styles.track,
            { height: trackHeight, backgroundColor: theme.color.surface2, borderColor: theme.color.line, opacity: hasValue ? 1 : 0.72 },
          ]}>
          <Animated.View
            style={[
              styles.fill,
              { height: '100%', backgroundColor: isRecordedOnly ? theme.color.info : color ?? theme.color.accent, borderRadius: isRecordedOnly ? theme.radius.pill : 0, width: fillWidth },
            ]}
          />
        </View>
      </View>
      {caption ? (
        <Body style={{ color: theme.color.muted, fontSize: captionFontSize }}>{caption}{overflow ? ' · over plan' : ''}</Body>
      ) : overflow ? (
        <Body style={{ color: theme.color.warn, fontSize: captionFontSize }}>Over plan</Body>
      ) : isRecordedOnly ? (
        <Body style={{ color: theme.color.info, fontSize: captionFontSize }}>Recorded · no target set</Body>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  trackContainer: { width: '100%', overflow: 'hidden' },
  track: { borderRadius: 999, borderWidth: 1, overflow: 'hidden' },
  fill: { height: '100%' },
});

import { useRef } from 'react';

export interface ProgressBarInlineProps {
  value: number | null;
  color?: string;
  size?: 'sm' | 'md';
  showAsRecordedOnly?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function ProgressBarInline({
  value,
  color,
  size = 'sm',
  showAsRecordedOnly = false,
  accessibilityLabel,
  style,
}: ProgressBarInlineProps) {
  const theme = useTheme();
  const hasValue = value != null && Number.isFinite(value);
  const fill = hasValue ? Math.min(1, Math.max(0, value)) : 0;
  const isRecordedOnly = showAsRecordedOnly === true;
  const trackHeight = size === 'sm' ? 6 : 8;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? 'Progress'}
      accessibilityValue={hasValue ? { min: 0, max: 100, now: Math.round(fill * 100) } : { text: 'Not enough data' }}
      style={{ flex: 1, minWidth: 0, ...style }}>
      <View
        style={{
          height: trackHeight,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.color.surface2,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.color.line,
          opacity: hasValue ? 1 : 0.5,
        }}>
        <View
          style={{
            width: `${fill * 100}%`,
            height: '100%',
            backgroundColor: isRecordedOnly ? theme.color.info : color ?? theme.color.accent,
            borderRadius: isRecordedOnly ? theme.radius.pill : 0,
          }}
        />
      </View>
    </View>
  );
}

export interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  showValue?: boolean;
  label?: string;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function CircularProgress({
  value,
  size = 64,
  strokeWidth = 6,
  color,
  trackColor,
  showValue = true,
  label,
  accessibilityLabel,
  style,
}: CircularProgressProps) {
  const theme = useTheme();
  const clampedValue = Math.min(1, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - clampedValue);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? `${label ?? 'Progress'} ${Math.round(clampedValue * 100)}%`}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clampedValue * 100) }}
      style={{ alignItems: 'center', justifyContent: 'center', ...style }}>
      <View style={{ width: size, height: size, transform: [{ rotate: '-90deg' }] }}>
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: trackColor ?? theme.color.surface2,
            borderStyle: 'solid',
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: color ?? theme.color.accent,
            borderStyle: 'solid',
            transform: [{ rotate: '90deg' }],
          }}>
          <Animated.View
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: color ?? theme.color.accent,
              borderStyle: 'solid',
              borderTopColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: 'transparent',
            }}
          />
        </View>
      </View>
      {showValue && (
        <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
          <TextPrimitive variant="body1" weight="semibold">{Math.round(clampedValue * 100)}%</TextPrimitive>
        </View>
      )}
    </View>
  );
}

export interface IndeterminateProgressProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  style?: ViewStyle;
}

export function IndeterminateProgress({ size = 'md', color, style }: IndeterminateProgressProps) {
  const theme = useTheme();
  const trackHeight = size === 'sm' ? 4 : size === 'lg' ? 12 : 8;
  const animatedValue = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    animatedValue.setValue(0);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 1500,
      easing: (t) => t,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        animatedValue.setValue(0);
      }
    });
  }, []);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-100%', '100%', '100%'],
  });
  const width = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0%', '50%', '0%'],
  });

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      accessibilityValue={{ text: 'Loading' }}
      style={{ height: trackHeight, borderRadius: theme.radius.pill, backgroundColor: theme.color.surface2, overflow: 'hidden', ...style }}>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          backgroundColor: color ?? theme.color.accent,
          borderRadius: theme.radius.pill,
          transform: [{ translateX }],
          width,
        }}
      />
    </View>
  );
}

export interface StepProgressProps {
  steps: Array<{ label: string; completed: boolean; current?: boolean; error?: boolean }>;
  direction?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function StepProgress({ steps, direction = 'horizontal', size = 'md', style }: StepProgressProps) {
  const theme = useTheme();
  const iconSize = size === 'sm' ? 20 : 28;
  const iconRadius = iconSize / 2;
  const lineWidth = size === 'sm' ? 2 : 3;
  const gap = size === 'sm' ? 8 : 12;

  return (
    <Box flexDirection={direction} gap={gap} style={style}>
      {steps.map((step, index) => (
        <Box key={step.label} flexDirection={direction} alignItems="center" gap={gap} flex={direction === 'horizontal' ? 1 : 0}>
          <Box
            style={{
              width: iconSize,
              height: iconSize,
              borderRadius: iconRadius,
              borderWidth: lineWidth,
              borderColor: step.completed || step.current ? theme.color.accent : theme.color.line,
              backgroundColor: step.completed ? theme.color.accent : step.current ? theme.color.surface : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}>
            {step.completed ? (
              <TextPrimitive style={{ color: theme.color.accentInk, fontSize: iconSize * 0.5 }}>✓</TextPrimitive>
            ) : step.error ? (
              <TextPrimitive style={{ color: theme.color.danger, fontSize: iconSize * 0.5 }}>✕</TextPrimitive>
            ) : step.current ? (
              <View style={{ width: iconSize * 0.4, height: iconSize * 0.4, borderRadius: iconSize * 0.2, backgroundColor: theme.color.accent }} />
            ) : null}
          </Box>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <TextPrimitive
              variant={size === 'sm' ? 'caption1' : 'body2'}
              weight={step.current ? 'semibold' : 'regular'}
              color={step.error ? theme.color.danger : step.completed || step.current ? theme.color.text : theme.color.muted}>
              {step.label}
            </TextPrimitive>
          </Box>
          {index < steps.length - 1 && (
            <Box
              style={{
                flex: direction === 'horizontal' ? 1 : 0,
                width: direction === 'horizontal' ? undefined : lineWidth,
                height: direction === 'vertical' ? undefined : lineWidth,
                backgroundColor: step.completed ? theme.color.accent : theme.color.line,
              }}
            />
          )}
        </Box>
      ))}
    </Box>
  );
}