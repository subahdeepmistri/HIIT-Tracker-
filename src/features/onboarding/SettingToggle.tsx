import React from 'react';
import { Switch, View } from 'react-native';

import { Body, Strong } from '@/src/ui/components/primitives';
import { useTheme } from '@/src/ui/theme/ThemeProvider';

export function SettingToggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 52,
        gap: 12,
      }}>
      <View style={{ flex: 1 }}>
        <Strong>{label}</Strong>
        {hint ? (
          <Body style={{ color: theme.color.muted, fontSize: 13, marginTop: 2 }}>{hint}</Body>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: theme.color.accent, false: theme.color.line }}
        thumbColor={theme.color.text}
      />
    </View>
  );
}
