import React, { useEffect, useRef } from 'react';
import { Modal, View, Pressable, Keyboard, Platform, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Box } from '../primitives/Box';
import { PressablePrimitive, Button } from '../primitives/Pressable';
import { Label, Body, TextPrimitive, Strong } from '../primitives/Text';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  hideCloseButton?: boolean;
  style?: ViewStyle;
  overlayStyle?: ViewStyle;
  animationType?: 'fade' | 'slide' | 'none';
  presentationStyle?: 'pageSheet' | 'formSheet' | 'overFullScreen' | 'fullScreen';
}

const sizeStyles: Record<string, ViewStyle> = {
  sm: { maxWidth: 320, width: '90%' },
  md: { maxWidth: 400, width: '90%' },
  lg: { maxWidth: 560, width: '90%' },
  xl: { maxWidth: 720, width: '90%' },
  full: { maxWidth: '100%', width: '100%', height: '100%', maxHeight: '100%' },
};

export function ModalPrimitive({
  visible,
  onClose,
  children,
  title,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  hideCloseButton = false,
  style,
  overlayStyle,
  animationType = 'fade',
  presentationStyle = 'pageSheet',
}: ModalProps) {
  const theme = useTheme();
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (visible && typeof document !== 'undefined') {
      previousActiveElement.current = document.activeElement as HTMLElement;
    }
    if (!visible && previousActiveElement.current) {
      (previousActiveElement.current as HTMLElement).focus?.();
    }
  }, [visible]);

  useEffect(() => {
    if (!closeOnEscape || typeof window === 'undefined') return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, closeOnEscape, onClose]);

  if (!visible) return null;

  const handleOverlayPress = () => {
    if (closeOnOverlayClick) onClose();
  };

  const handleRequestClose = () => {
    if (closeOnOverlayClick || closeOnEscape) onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      presentationStyle={presentationStyle}
      onRequestClose={handleRequestClose}
      supportedOrientations={['portrait', 'landscape']}>
      <Pressable
        onPress={handleOverlayPress}
        accessibilityLabel="Close modal"
        style={{
          flex: 1,
          backgroundColor: theme.color.overlay,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          ...overlayStyle,
        }}>
        <View
          accessible
          accessibilityRole="dialog"
          accessibilityModal="true"
          accessibilityLabel={title}
          style={{
            zIndex: 2,
            width: '100%',
            maxHeight: '90%',
            backgroundColor: theme.color.surface,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.color.line,
            overflow: 'hidden',
            ...sizeStyles[size],
            ...style,
          }}>
          {title && (
            <Box style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.color.line }}>
              <TextPrimitive variant="title2" weight="semibold">{title}</TextPrimitive>
              {!hideCloseButton && (
                <PressablePrimitive variant="ghost" size="sm" onPress={onClose} accessibilityLabel="Close">
                  <TextPrimitive variant="caption1" color={theme.color.muted}>✕</TextPrimitive>
                </PressablePrimitive>
              )}
            </Box>
          )}
          <Box style={{ padding: title ? 20 : 20, maxHeight: size === 'full' ? '100%' : undefined, overflow: 'hidden' }}>
            {children}
          </Box>
        </View>
      </Pressable>
    </Modal>
  );
}

export interface DialogProps {
  visible: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  loading?: boolean;
  hideCancel?: boolean;
}

export function Dialog({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
  hideCancel = false,
}: DialogProps) {
  const theme = useTheme();

  return (
    <ModalPrimitive
      visible={visible}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
    >
      <Box style={{ gap: 16 }}>
        <Body style={{ color: theme.color.muted, textAlign: 'center' }}>{message}</Body>
        <Box style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
          {!hideCancel && (
            <Button
              label={cancelLabel}
              variant="ghost"
              large
              onPress={onClose}
              disabled={loading}
            />
          )}
          <Button
            label={confirmLabel}
            variant={variant === 'danger' ? 'danger' : 'primary'}
            large
            onPress={onConfirm}
            disabled={loading}
            loading={loading}
          />
        </Box>
      </Box>
    </ModalPrimitive>
  );
}

export interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  options: Array<{
    label: string;
    onPress: () => void;
    variant?: 'default' | 'danger';
    disabled?: boolean;
    icon?: React.ReactNode;
  }>;
  cancelLabel?: string;
}

export function ActionSheet({ visible, onClose, title, message, options, cancelLabel = 'Cancel' }: ActionSheetProps) {
  const theme = useTheme();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: theme.color.overlay, justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: theme.color.surface,
            borderTopLeftRadius: theme.radius.lg,
            borderTopRightRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.color.line,
            paddingBottom: 20,
            maxHeight: '80%',
          }}>
          {(title || message) && (
            <Box style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: theme.color.line, gap: 8 }}>
              {title && <TextPrimitive variant="title2" weight="semibold">{title}</TextPrimitive>}
              {message && <Body style={{ color: theme.color.muted }}>{message}</Body>}
            </Box>
          )}
          <Box style={{ gap: 8, paddingHorizontal: 16 }}>
            {options.map((option, index) => (
              <PressablePrimitive
                key={index}
                variant={option.variant === 'danger' ? 'danger' : 'primary'}
                size="md"
                large
                disabled={option.disabled}
                onPress={() => { option.onPress(); onClose(); }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {option.icon}
                <TextPrimitive variant="body1" weight="semibold">{option.label}</TextPrimitive>
              </PressablePrimitive>
            ))}
            <PressablePrimitive variant="ghost" size="md" large onPress={onClose} style={{ marginTop: 8 }}>
              <TextPrimitive variant="body1" weight="semibold">{cancelLabel}</TextPrimitive>
            </PressablePrimitive>
          </Box>
        </View>
      </Pressable>
    </Modal>
  );
}

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  snapPoints?: number[];
  initialSnap?: number;
  handleIndicator?: boolean;
  style?: ViewStyle;
}

export function BottomSheet({ visible, onClose, children, title, snapPoints = [0.5, 0.9], initialSnap = 0, handleIndicator = true, style }: BottomSheetProps) {
  const theme = useTheme();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: theme.color.overlay, justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: theme.color.surface,
            borderTopLeftRadius: theme.radius.lg,
            borderTopRightRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.color.line,
            maxHeight: '90%',
            ...style,
          }}>
          {handleIndicator && (
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.color.muted, opacity: 0.4 }} />
            </View>
          )}
          {title && (
            <Box style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: theme.color.line }}>
              <TextPrimitive variant="title2" weight="semibold">{title}</TextPrimitive>
            </Box>
          )}
          <Box style={{ padding: 20, flex: 1, overflow: 'scroll' }}>{children}</Box>
        </View>
      </Pressable>
    </Modal>
  );
}