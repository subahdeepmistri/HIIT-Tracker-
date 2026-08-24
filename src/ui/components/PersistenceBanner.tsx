import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

export type PersistenceFailureKind = 'quota' | 'unavailable' | 'serialize' | 'unknown';

export interface PersistenceStatus {
  ok: boolean;
  failure: { kind: PersistenceFailureKind; message: string } | null;
  source: 'snapshot' | 'live';
}

const COPY: Record<PersistenceFailureKind, string> = {
  quota: 'Device storage is full. Recent changes may not be saved — export your data from Settings to free space.',
  unavailable:
    'Storage is unavailable (private browsing or restricted permissions). Changes will stay in this window only and are not being saved.',
  serialize:
    'An internal error prevented saving. Your data is still visible here — please export it before closing.',
  unknown: 'A saving problem occurred. Recent changes may not be saved.',
};

/**
 * Persistent, calm, honest banner shown while persistence is degraded.
 * Nothing is hidden behind colour alone: warning glyph + plain-language copy,
 * alert role so screen readers announce it once, dismissible per distinct
 * failure (a new kind or message re-shows automatically).
 */
export function PersistenceBanner({ status }: { status: PersistenceStatus }) {
  const theme = useTheme();
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  if (status.ok || !status.failure) return null;
  const { kind, message } = status.failure;
  const key = `${kind}:${message}`;
  if (dismissedKey === key) return null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Saving problem: ${COPY[kind]}`}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: theme.color.surface,
        borderColor: theme.color.warn,
        borderWidth: 1,
        borderRadius: theme.radius.md,
        paddingVertical: 10,
        paddingHorizontal: 14,
      }}>
      <Text style={{ fontSize: 16, lineHeight: 20 }} accessibilityLabel="Warning">
        ⚠️
      </Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: theme.type.uiStrong, color: theme.color.text, fontSize: 13 }}>
          Not saving right now
        </Text>
        <Text style={{ fontFamily: theme.type.uiBook, color: theme.color.muted, fontSize: 13, marginTop: 2 }}>
          {kind === 'unknown' ? `${COPY[kind]} (${message})` : COPY[kind]}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss saving notice"
        onPress={() => setDismissedKey(key)}
        hitSlop={8}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}>
        <Text style={{ color: theme.color.muted, fontSize: 14 }}>✕</Text>
      </Pressable>
    </View>
  );
}
