import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { Label } from '@/src/ui/components/primitives';
import { useTheme } from '@/src/ui/theme/ThemeProvider';

export function PresetRow({
  label,
  options,
  value,
  format,
  onChange,
}: {
  label: string;
  options: readonly number[];
  value: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <Label>{label}</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={`${label}-${option}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label} ${format ? format(option) : option}`}
              onPress={() => onChange(option)}
              style={({ pressed }) => ({
                minHeight: 44,
                minWidth: 56,
                paddingHorizontal: 14,
                borderRadius: theme.radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: selected ? theme.color.accent : theme.color.surface2,
                borderWidth: 1,
                borderColor: selected ? theme.color.accent : theme.color.line,
                opacity: pressed ? 0.82 : 1,
              })}>
              <Text
                style={{
                  fontFamily: theme.type.uiStrong,
                  fontSize: 14,
                  color: selected ? theme.color.accentInk : theme.color.text,
                }}>
                {format ? format(option) : option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
