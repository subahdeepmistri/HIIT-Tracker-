import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform, Pressable, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Body, Strong, TextPrimitive } from '../primitives';
import { Box } from '../primitives/Box';
import { PressablePrimitive } from '../primitives/Pressable';

export type ToastVariant = 'info' | 'success' | 'warn' | 'error';

export interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
  action?: { label: string; onPress: () => void };
  title?: string;
}

const toastQueue = new Map<string, ToastMessage>();
let subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((cb) => cb());
}

export function showToast(
  message: string,
  variant: ToastVariant = 'info',
  options?: { duration?: number; action?: { label: string; onPress: () => void }; title?: string }
) {
  const id = Math.random().toString(36).slice(2);
  toastQueue.set(id, { id, message, variant, duration: options?.duration ?? 4000, action: options?.action, title: options?.title });
  notify();
  if ((options?.duration ?? 4000) > 0) {
    setTimeout(() => {
      toastQueue.delete(id);
      notify();
    }, options?.duration ?? 4000);
  }
  return id;
}

export function hideToast(id: string) {
  toastQueue.delete(id);
  notify();
}

export function useToastQueue(): ToastMessage[] {
  const [, setTick] = useState(0);
  useEffect(() => {
    const cb = () => setTick((t) => t + 1);
    subscribers.add(cb);
    return () => {
      subscribers.delete(cb);
    };
  }, []);
  return Array.from(toastQueue.values());
}

const variantStyles: Record<ToastVariant, { bg: string; border: string; icon: string; textColor: string }> = {
  info: { bg: '#1E3A5F', border: '#3B82F6', icon: 'ℹ', textColor: '#FFFFFF' },
  success: { bg: '#064E3B', border: '#10B981', icon: '✓', textColor: '#FFFFFF' },
  warn: { bg: '#78350F', border: '#F59E0B', icon: '⚠', textColor: '#FFFFFF' },
  error: { bg: '#7F1D1D', border: '#EF4444', icon: '✕', textColor: '#FFFFFF' },
};

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  const theme = useTheme();
  const style = variantStyles[toast.variant];
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();

    let timer: ReturnType<typeof setTimeout> | null = null;
    if (toast.duration && toast.duration > 0) {
      timer = setTimeout(() => {
        onDismiss();
      }, toast.duration);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleDismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -20, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      hideToast(toast.id);
    });
  }, [toast.id]);

  return (
    <Animated.View
      accessible
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      style={[
        styles.container,
        { backgroundColor: style.bg, borderColor: style.border },
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}>
      <View style={styles.row}>
        <Text style={[styles.icon, { color: style.border }]}>{style.icon}</Text>
        <View style={styles.content}>
          {toast.title && <Strong style={{ color: style.textColor }}>{toast.title}</Strong>}
          <Body style={{ color: style.textColor }}>{toast.message}</Body>
          {toast.action && (
            <PressablePrimitive
              variant="ghost"
              size="sm"
              onPress={() => { toast.action?.onPress(); handleDismiss(); }}
              style={{ marginTop: 4 }}
            >
              <TextPrimitive variant="label2" color={style.border} weight="semibold">
                {toast.action.label}
              </TextPrimitive>
            </PressablePrimitive>
          )}
        </View>
      </View>
      <PressablePrimitive variant="ghost" size="sm" onPress={handleDismiss} accessibilityLabel="Dismiss">
        <TextPrimitive variant="caption1" color={style.textColor} style={{ opacity: 0.7 }}>✕</TextPrimitive>
      </PressablePrimitive>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    minWidth: 280,
    maxWidth: '90%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 12 },
  icon: { fontSize: 18, lineHeight: 20, marginTop: 1 },
  content: { flex: 1, gap: 4 },
  close: { fontSize: 18, lineHeight: 20, padding: 4 },
});

export function ToastContainer() {
  const toasts = useToastQueue();
  if (toasts.length === 0) return null;

  return (
    <View
      style={containerStyles.containerWrapper}
      pointerEvents="box-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => hideToast(toast.id)} />
      ))}
    </View>
  );
}

const containerStyles = StyleSheet.create({
  containerWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'column',
    gap: 8,
    alignItems: 'center',
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
});

export interface AlertProps {
  variant?: ToastVariant;
  title?: string;
  message: string;
  onDismiss?: () => void;
  dismissible?: boolean;
  action?: { label: string; onPress: () => void };
  style?: ViewStyle;
}

export function Alert({ variant = 'info', title, message, onDismiss, dismissible = true, action, style }: AlertProps) {
  const theme = useTheme();
  const styleTokens = variantStyles[variant];

  return (
    <View
      accessible
      role="alert"
      aria-live="polite"
      style={[
        styles.alertContainer,
        { backgroundColor: styleTokens.bg, borderColor: styleTokens.border },
        style,
      ]}>
      <View style={styles.alertRow}>
        <Text style={[styles.icon, { color: styleTokens.border }]}>{styleTokens.icon}</Text>
        <View style={styles.alertContent} style={[{ color: styleTokens.textColor }]}>
          {title && <Strong style={{ color: styleTokens.textColor }}>{title}</Strong>}
          <Body style={{ color: styleTokens.textColor }}>{message}</Body>
          {action && (
            <PressablePrimitive
              variant={variant === 'error' ? 'danger' : 'primary'}
              size="sm"
              onPress={action.onPress}
              style={{ marginTop: 8 }}
            >
              {action.label}
            </PressablePrimitive>
          )}
        </View>
        {dismissible && onDismiss && (
          <PressablePrimitive variant="ghost" size="sm" onPress={onDismiss} accessibilityLabel="Dismiss">
            <TextPrimitive variant="caption1" color={styleTokens.textColor} style={{ opacity: 0.7 }}>✕</TextPrimitive>
          </PressablePrimitive>
        )}
      </View>
    </View>
  );
}

const alertStyles = StyleSheet.create({
  alertContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  alertRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icon: { fontSize: 18, lineHeight: 20, marginTop: 1 },
  alertContent: { flex: 1, gap: 4 },
});

export interface SnackbarProps {
  message: string;
  variant?: ToastVariant;
  action?: { label: string; onPress: () => void };
  duration?: number;
  onDismiss?: () => void;
  visible: boolean;
}

export function Snackbar({ message, variant = 'info', action, duration = 4000, onDismiss, visible }: SnackbarProps) {
  if (!visible) return null;

  const theme = useTheme();
  const styleTokens = variantStyles[variant];
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();

    let timer: ReturnType<typeof setTimeout> | null = null;
    if (duration > 0) {
      timer = setTimeout(() => {
        onDismiss?.();
      }, duration);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [visible]);

  const handleDismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 100, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      onDismiss?.();
    });
  }, []);

  return (
    <Animated.View
      style={[
        styles.snackbarContainer,
        { backgroundColor: styleTokens.bg, borderColor: styleTokens.border },
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
      pointerEvents="box-none">
      <View style={styles.snackbarRow}>
        <Text style={[styles.icon, { color: styleTokens.border }]}>{styleTokens.icon}</Text>
        <Body style={{ color: styleTokens.textColor, flex: 1 }}>{message}</Body>
        {action && (
          <PressablePrimitive variant="ghost" size="sm" onPress={() => { action.onPress(); handleDismiss(); }}>
            <TextPrimitive variant="label2" color={styleTokens.border} weight="semibold">{action.label}</TextPrimitive>
          </PressablePrimitive>
        )}
        <PressablePrimitive variant="ghost" size="sm" onPress={handleDismiss} accessibilityLabel="Dismiss">
          <TextPrimitive variant="caption1" color={styleTokens.textColor} style={{ opacity: 0.7 }}>✕</TextPrimitive>
        </PressablePrimitive>
      </View>
    </Animated.View>
  );
}

const snackbarStyles = StyleSheet.create({
  snackbarContainer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 9999,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  snackbarRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});