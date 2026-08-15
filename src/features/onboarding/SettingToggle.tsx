import React from 'react';
import { Switch, View } from 'react-native';

import { Body, Strong } from '@/src/ui/components/primitives';
import { useTheme } from '@/src/ui/theme/ThemeProvider';

export function SettingToggle({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
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
        opacity: disabled ? 0.38 : 1,
      }}>
      <View style={{ flex: 1 }}>
        <Strong>{label}</Strong>
        {hint ? (
          <Body style={{ color: theme.color.muted, fontSize: 13, marginTop: 2 }}>{hint}</Body>
        ) : null}
      </View>
      <Switch
        value={disabled ? false : value}
        onValueChange={onChange}
        disabled={disabled}
        accessibilityLabel={label}
        accessibilityState={{ disabled: Boolean(disabled), checked: disabled ? false : value }}
        trackColor={{ true: theme.color.accent, false: theme.color.line }}
        thumbColor={theme.color.text}
      />
    </View>
  );
}
