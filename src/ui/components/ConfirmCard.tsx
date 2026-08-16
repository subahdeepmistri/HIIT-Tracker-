import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import type { ConfirmRequest } from '../confirm';
import { Body, Button, Label } from './primitives';
import { useTheme } from '../theme/ThemeProvider';

export function ConfirmCard({
  request,
  onCancel,
  onConfirm,
}: {
  request: ConfirmRequest | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const theme = useTheme();
  const open = request != null;
  const danger = request?.tone === 'danger';

  useEffect(() => {
    if (!open || typeof window === 'undefined') return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel}>
      <View
        accessibilityViewIsModal
        style={{
          flex: 1,
          backgroundColor: theme.color.overlay,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}>
        <Pressable
          accessibilityLabel="Dismiss"
          onPress={onCancel}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        />
        {request ? (
          <View
            accessibilityRole="alert"
            style={{
              zIndex: 2,
              width: '100%',
              maxWidth: 400,
              backgroundColor: theme.color.surface,
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderColor: danger ? 'rgba(255,90,90,0.35)' : theme.color.line,
              padding: 24,
              gap: 18,
            }}>
            <View style={{ alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: danger ? 'rgba(255,90,90,0.12)' : theme.color.surface2,
                }}>
                <Ionicons
                  name={danger ? 'trash-outline' : 'help-circle-outline'}
                  size={26}
                  color={danger ? theme.color.danger : theme.color.accent}
                />
              </View>
              <Label style={{ color: danger ? theme.color.danger : theme.color.muted }}>
                {danger ? 'Cannot be undone' : 'Please confirm'}
              </Label>
              <Text
                style={{
                  fontFamily: theme.type.display,
                  color: theme.color.text,
                  fontSize: 32,
                  lineHeight: 34,
                  letterSpacing: -0.4,
                  textAlign: 'center',
                }}>
                {request.title}
              </Text>
              <Body style={{ color: theme.color.muted, textAlign: 'center' }}>{request.message}</Body>
            </View>

            <View style={{ gap: 10 }}>
              <Button
                label={request.cancelLabel ?? 'Cancel'}
                variant="ghost"
                large
                onPress={onCancel}
                accessibilityHint="Closes this card and keeps the current session"
              />
              <Button
                label={request.confirmLabel ?? 'Yes'}
                variant={danger ? 'danger' : 'primary'}
                large
                onPress={onConfirm}
                accessibilityHint="Confirms this action"
              />
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
