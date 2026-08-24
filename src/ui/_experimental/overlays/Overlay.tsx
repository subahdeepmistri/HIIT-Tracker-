import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, Animated, Platform, Keyboard, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Box } from '../primitives/Box';
import { TextPrimitive } from '../primitives/Text';
import { PressablePrimitive, Button } from '../primitives/Pressable';
import { ModalPrimitive } from '../../feedback/Modal';

export interface PopoverProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  anchor: React.ReactElement;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';
  offset?: number;
  closeOnOutsideClick?: boolean;
  closeOnEscape?: boolean;
  showArrow?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

export function Popover({
  visible,
  onClose,
  children,
  anchor,
  placement = 'bottom',
  offset = 8,
  closeOnOutsideClick = true,
  closeOnEscape = true,
  showArrow = true,
  style,
  contentStyle,
}: PopoverProps) {
  const theme = useTheme();
  const [anchorLayout, setAnchorLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const popoverRef = useRef<View>(null);

  useEffect(() => {
    if (visible && anchor && typeof anchor.props.onLayout === 'function') {
      // In a real implementation, we'd use measure or onLayout
      // For now, we'll simulate
    }
  }, [visible, anchor]);

  if (!visible) return null;

  const isTop = placement.startsWith('top');
  const isLeft = placement.startsWith('left');
  const isStart = placement.endsWith('start');
  const isEnd = placement.endsWith('end');

  return (
    <ModalPrimitive
      visible={visible}
      onClose={onClose}
      closeOnOverlayClick={closeOnOutsideClick}
      closeOnEscape={closeOnEscape}
      animationType="fade"
      style={{ ...style, margin: 0, padding: 0, maxWidth: 320, borderRadius: theme.radius.md }}>
      <Box
        style={{
          backgroundColor: theme.color.surface,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.color.line,
          padding: 12,
          minWidth: 200,
          maxWidth: 320,
          ...contentStyle,
        }}>
        {children}
        {showArrow && (
          <View
            style={{
              position: 'absolute',
              bottom: isTop ? undefined : -6,
              top: isTop ? -6 : undefined,
              left: isLeft ? 12 : isEnd ? 'auto' : isStart ? 12 : '50%',
              right: isLeft ? 'auto' : isEnd ? 12 : isStart ? 'auto' : '50%',
              marginLeft: isLeft || isEnd || isStart ? 0 : -6,
              width: 0,
              height: 0,
              borderLeftWidth: 6,
              borderRightWidth: 6,
              borderBottomWidth: isTop ? 0 : 6,
              borderTopWidth: isTop ? 6 : 0,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: isTop ? 'transparent' : theme.color.surface,
              borderTopColor: isTop ? theme.color.surface : 'transparent',
            }}
          />
        )}
      </Box>
    </ModalPrimitive>
  );
}

export interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

export function Tooltip({ children, content, placement = 'top', delay = 200, style, contentStyle }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const show = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  return (
    <Pressable
      onPressIn={show}
      onPressOut={hide}
      onMouseEnter={show}
      onMouseLeave={hide}
      style={style}>
      {React.cloneElement(children as React.ReactElement, { onPressIn: show, onPressOut: hide, onMouseEnter: show, onMouseLeave: hide })}
      {visible && (
        <View
          style={[
            {
              position: 'absolute',
              zIndex: 1000,
              backgroundColor: '#111318',
              borderRadius: 6,
              padding: 8,
              maxWidth: 280,
            },
            contentStyle,
          ]}>
          {typeof content === 'string' ? <TextPrimitive variant="caption1" color="#F4F1EA">{content}</TextPrimitive> : content}
        </View>
      )}
    </Pressable>
  );
}

export interface MenuItem {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  destructive?: boolean;
  shortcut?: string;
  dividerAfter?: boolean;
}

export interface MenuProps {
  visible: boolean;
  onClose: () => void;
  items: MenuItem[];
  anchor?: React.ReactElement;
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
  style?: ViewStyle;
  itemStyle?: ViewStyle;
}

export function Menu({ visible, onClose, items, anchor, placement = 'bottom-start', style, itemStyle }: MenuProps) {
  const theme = useTheme();

  if (!visible) return null;

  return (
    <ModalPrimitive
      visible={visible}
      onClose={onClose}
      closeOnOverlayClick={true}
      closeOnEscape={true}
      animationType="fade"
      style={{ ...style, margin: 0, padding: 0, maxWidth: 280 }}>
      <Box
        style={{
          backgroundColor: theme.color.surface,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.color.line,
          overflow: 'hidden',
          minWidth: 200,
          maxWidth: 280,
        }}>
        {items.map((item, index) => (
          <React.Fragment key={index}>
            <PressablePrimitive
              variant="ghost"
              size="sm"
              disabled={item.disabled}
              onPress={() => { item.onPress(); onClose(); }}
              accessibilityRole="menuitem"
              accessibilityState={{ disabled: item.disabled }}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  gap: 10,
                  backgroundColor: pressed && !item.disabled ? theme.color.surface2 : 'transparent',
                },
                itemStyle,
              ]}>
              {item.icon && <Box style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>{item.icon}</Box>}
              <TextPrimitive variant="body2" color={item.destructive ? theme.color.danger : item.disabled ? theme.color.muted : theme.color.text}>
                {item.label}
              </TextPrimitive>
              {item.shortcut && <TextPrimitive variant="caption1" color={theme.color.muted}>{item.shortcut}</TextPrimitive>}
            </PressablePrimitive>
            {item.dividerAfter && index < items.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </Box>
    </ModalPrimitive>
  );
}

import { Divider } from '../display/Divider';

export interface ContextMenuProps {
  children: React.ReactNode;
  items: MenuItem[];
  style?: ViewStyle;
}

export function ContextMenu({ children, items, style }: ContextMenuProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const theme = useTheme();

  const handleContextMenu = (e: React.MouseEvent | React.GestureResponderEvent) => {
    e.preventDefault();
    const clientX = 'clientX' in e ? e.clientX : e.nativeEvent.locationX;
    const clientY = 'clientY' in e ? e.clientY : e.nativeEvent.locationY;
    setPosition({ x: clientX, y: clientY });
    setVisible(true);
  };

  return (
    <>
      <Pressable onContextMenu={handleContextMenu} onLongPress={handleContextMenu} style={style}>
        {children}
      </Pressable>
      {visible && (
        <View
          style={{
            position: 'absolute',
            top: position.y,
            left: position.x,
            zIndex: 1000,
            backgroundColor: theme.color.surface,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.color.line,
            overflow: 'hidden',
            minWidth: 200,
            maxWidth: 280,
          }}>
        {items.map((item, index) => (
          <PressablePrimitive
            key={index}
            variant="ghost"
            size="sm"
            disabled={item.disabled}
            onPress={() => { item.onPress(); setVisible(false); }}
            accessibilityRole="menuitem"
            accessibilityState={{ disabled: item.disabled }}
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
                paddingHorizontal: 12,
                gap: 10,
                backgroundColor: pressed && !item.disabled ? theme.color.surface2 : 'transparent',
              },
            ]}>
            {item.icon && <Box style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>{item.icon}</Box>}
            <TextPrimitive variant="body2" color={item.destructive ? theme.color.danger : item.disabled ? theme.color.muted : theme.color.text}>
              {item.label}
            </TextPrimitive>
            {item.shortcut && <TextPrimitive variant="caption1" color={theme.color.muted}>{item.shortcut}</TextPrimitive>}
          </PressablePrimitive>
        ))}
      </View>
      )}
    </>
  );
}

export interface DrawerProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  position?: 'left' | 'right' | 'top' | 'bottom';
  size?: number | string;
  overlay?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

export function Drawer({
  visible,
  onClose,
  children,
  position = 'left',
  size = 320,
  overlay = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  style,
  contentStyle,
}: DrawerProps) {
  const theme = useTheme();

  if (!visible) return null;

  const isHorizontal = position === 'left' || position === 'right';
  const transform = isHorizontal ? [{ translateX: position === 'left' ? -size : size }] : [{ translateY: position === 'top' ? -size : size }];

  return (
    <ModalPrimitive
      visible={visible}
      onClose={onClose}
      closeOnOverlayClick={closeOnOverlayClick}
      closeOnEscape={closeOnEscape}
      animationType="slide"
      presentationStyle="overFullScreen"
      style={{ ...style, margin: 0, padding: 0, width: isHorizontal ? size : '100%', height: isHorizontal ? '100%' : size, maxWidth: isHorizontal ? size : '100%', maxHeight: isHorizontal ? '100%' : size, borderRadius: 0 }}>
      <View style={{ flex: 1, backgroundColor: overlay ? theme.color.overlay : 'transparent' }}>
        <Animated.View
          style={{
            position: 'absolute',
            [position]: 0,
            top: isHorizontal ? 0 : undefined,
            bottom: isHorizontal ? 0 : undefined,
            left: position === 'left' ? 0 : undefined,
            right: position === 'right' ? 0 : undefined,
            width: isHorizontal ? size : '100%',
            height: isHorizontal ? '100%' : size,
            backgroundColor: theme.color.surface,
            borderWidth: 1,
            borderColor: theme.color.line,
            borderTopLeftRadius: position === 'top' ? theme.radius.lg : 0,
            borderTopRightRadius: position === 'top' ? theme.radius.lg : 0,
            borderBottomLeftRadius: position === 'bottom' ? theme.radius.lg : 0,
            borderBottomRightRadius: position === 'bottom' ? theme.radius.lg : 0,
            ...contentStyle,
          }}>
          {children}
        </Animated.View>
      </View>
    </ModalPrimitive>
  );
}

export interface DialogProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  hideCloseButton?: boolean;
  style?: ViewStyle;
}

export function Dialog({ visible, onClose, title, description, children, size = 'md', closeOnOverlayClick = true, closeOnEscape = true, hideCloseButton = false, style }: DialogProps) {
  return (
    <ModalPrimitive
      visible={visible}
      onClose={onClose}
      title={title}
      size={size}
      closeOnOverlayClick={closeOnOverlayClick}
      closeOnEscape={closeOnEscape}
      hideCloseButton={hideCloseButton}
      style={style}>
      {description && <TextPrimitive variant="body2" color="muted" style={{ marginBottom: 16 }}>{description}</TextPrimitive>}
      {children}
    </ModalPrimitive>
  );
}

export interface AlertDialogProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  loading?: boolean;
  style?: ViewStyle;
}

export function AlertDialog({ visible, onClose, onConfirm, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'default', loading = false, style }: AlertDialogProps) {
  const theme = useTheme();

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
      style={style}>
      {description && <TextPrimitive variant="body2" color={theme.color.muted} style={{ marginBottom: 16 }}>{description}</TextPrimitive>}
      <Box flexDirection="row" justifyContent="flex-end" gap={10}>
        <Button label={cancelLabel} variant="ghost" large onPress={onClose} disabled={loading} />
        <Button label={confirmLabel} variant={variant === 'danger' ? 'danger' : 'primary'} large onPress={onConfirm} disabled={loading} loading={loading} />
      </Box>
    </Dialog>
  );
}

export interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  items: Array<{ label: string; onPress: () => void; variant?: 'default' | 'danger'; disabled?: boolean; icon?: React.ReactNode }>;
  cancelLabel?: string;
  style?: ViewStyle;
}

export function ActionSheet({ visible, onClose, title, message, items, cancelLabel = 'Cancel', style }: ActionSheetProps) {
  const theme = useTheme();

  if (!visible) return null;

  return (
    <ModalPrimitive
      visible={visible}
      onClose={onClose}
      animationType="slide"
      presentationStyle="pageSheet"
      style={{ ...style, margin: 0, padding: 0, maxHeight: '80%', borderTopLeftRadius: theme.radius.lg, borderTopRightRadius: theme.radius.lg }}>
      <Box style={{ backgroundColor: theme.color.surface, maxHeight: '80%' }}>
        {(title || message) && (
          <Box style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: theme.color.line, gap: 8 }}>
            {title && <TextPrimitive variant="title2" weight="semibold">{title}</TextPrimitive>}
            {message && <TextPrimitive variant="body2" color={theme.color.muted}>{message}</TextPrimitive>}
          </Box>
        )}
        <Box style={{ padding: 16, gap: 8 }}>
          {items.map((item, index) => (
            <PressablePrimitive
              key={index}
              variant={item.variant === 'danger' ? 'danger' : 'primary'}
              size="md"
              large
              disabled={item.disabled}
              onPress={() => { item.onPress(); onClose(); }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {item.icon}
              <TextPrimitive variant="body1" weight="semibold">{item.label}</TextPrimitive>
            </PressablePrimitive>
          ))}
          <PressablePrimitive variant="ghost" size="md" large onPress={onClose} style={{ marginTop: 8 }}>
            <TextPrimitive variant="body1" weight="semibold">{cancelLabel}</TextPrimitive>
          </PressablePrimitive>
        </Box>
      </Box>
    </ModalPrimitive>
  );
}