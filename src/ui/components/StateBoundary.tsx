import React from 'react';
import { ActivityIndicator, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Body, Button, Card } from './primitives';

/**
 * The four honest states any region that displays data can be in. Callers must
 * construct one of these explicitly — components never guess from undefined.
 * Mirrors the Phase 2.4 rule: zero, no-data, failed and loading are never
 * conflated with each other.
 */
export type ViewState<T> =
  | { kind: 'loading' }
  | { kind: 'empty'; title: string; body: string; action?: React.ReactNode }
  | { kind: 'error'; message: string; retry?: () => void }
  | { kind: 'data'; data: T };

export interface StateBoundaryProps<T> {
  state: ViewState<T>;
  /** Rendered only for kind:'data'. */
  render: (data: T) => React.ReactNode;
  /** Spoken while loading; also the visible caption under the spinner. */
  loadingLabel?: string;
  style?: ViewStyle;
}

/**
 * Region boundary that renders exactly what its state says — nothing invented,
 * nothing interpolated. Live-region so screen readers hear the transition
 * from loading/error into real content.
 */
export function StateBoundary<T>({ state, render, loadingLabel = 'Loading', style }: StateBoundaryProps<T>) {
  const theme = useTheme();

  return (
    <View accessibilityLiveRegion="polite" style={style}>
      {state.kind === 'loading' ? (
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={loadingLabel}
          accessibilityValue={{ text: loadingLabel }}
          style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 }}>
          <ActivityIndicator color={theme.color.accent} />
          <Body style={{ color: theme.color.muted, fontSize: 13 }}>{loadingLabel}</Body>
        </View>
      ) : state.kind === 'empty' ? (
        <EmptyStateInline title={state.title} body={state.body} action={state.action} />
      ) : state.kind === 'error' ? (
        <Card style={{ borderColor: theme.color.warn, borderWidth: 1, gap: 10 }}>
          <Body style={{ fontFamily: theme.type.uiStrong }}>⚠️ Couldn’t load this</Body>
          <Body style={{ color: theme.color.muted }}>{state.message}</Body>
          {state.retry ? (
            <Button label="Try again" variant="ghost" onPress={state.retry} />
          ) : null}
        </Card>
      ) : (
        render(state.data)
      )}
    </View>
  );
}

function EmptyStateInline({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Card>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: theme.type.display, color: theme.color.text, fontSize: 28, lineHeight: 30 }}>
        {title}
      </Text>
      <Body style={{ marginTop: 8 }}>{body}</Body>
      {action ? <View style={{ marginTop: 16 }}>{action}</View> : null}
    </Card>
  );
}
