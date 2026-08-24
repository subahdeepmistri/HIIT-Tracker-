import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Platform, Pressable } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Body, Strong } from './primitives';

export type ToastVariant = 'info' | 'success' | 'warn' | 'error';

export interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
  action?: { label: string; onPress: () => void };
}

const toastQueue = new Map<string, ToastMessage>();
let subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((cb) => cb());
}

export function showToast(message: string, variant: ToastVariant = 'info', options?: {
  duration?: number;
  action?: { label: string; onPress: () => void };
}) {
  const id = Math.random().toString(36).slice(2);
  toastQueue.set(id, { id, message, variant, duration: options?.duration ?? 4000, action: options?.action });
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
    // Cleanup function must return void explicitly
    return () => {
      subscribers.delete(cb);
    };
  }, []);
  return Array.from(toastQueue.values());
}

const variantStyles: Record<ToastVariant, { bg: string; border: string; icon: string }> = {
  info: { bg: '#1E3A5F', border: '#3B82F6', icon: 'ℹ' },
  success: { bg: '#064E3B', border: '#10B981', icon: '✓' },
  warn: { bg: '#78350F', border: '#F59E0B', icon: '⚠' },
  error: { bg: '#7F1D1D', border: '#EF4444', icon: '✕' },
};

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  const theme = useTheme();
  const style = variantStyles[toast.variant];
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(20);

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
    function cleanup(): void {
      if (timer) {
        clearTimeout(timer);
      }
    }
    return cleanup;
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
        <Body style={{ color: theme.color.text }}>{toast.message}</Body>
        {toast.action && (
          <Text
            style={{ color: style.border, fontFamily: theme.type.uiStrong, marginTop: 4 }}
            onPress={() => { toast.action?.onPress(); handleDismiss(); }}>
            {toast.action.label}
          </Text>
        )}
      </View>
    </View>
    <Pressable onPress={handleDismiss} accessibilityLabel="Dismiss">
      <Text style={[styles.close, { color: theme.color.muted }]}>✕</Text>
    </Pressable>
  </Animated.View>
)
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