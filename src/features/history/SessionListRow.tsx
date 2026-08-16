import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Body, Label, Strong } from '../../ui/components/primitives';
import { useTheme } from '../../ui/theme/ThemeProvider';

export function SessionListRow({
  title,
  subtitle,
  badge,
  onOpen,
  onDelete,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.color.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.color.line,
        overflow: 'hidden',
      }}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={{ flex: 1, padding: 16, minHeight: theme.touch.min, justifyContent: 'center' }}>
        {badge ? <Label>{badge}</Label> : null}
        <Strong style={{ marginTop: badge ? 4 : 0 }}>{title}</Strong>
        <Body style={{ color: theme.color.muted, marginTop: 4 }}>{subtitle}</Body>
      </Pressable>
      <Pressable
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${title}`}
        accessibilityHint="Removes this recorded session from this device"
        style={({ pressed }) => ({
          minWidth: theme.touch.min,
          minHeight: theme.touch.min,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 12,
          opacity: pressed ? 0.7 : 1,
        })}>
        <Ionicons name="trash-outline" size={20} color={theme.color.danger} />
      </Pressable>
    </View>
  );
}
