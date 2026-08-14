import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isValue } from '@/src/domain/metrics';
import { Units } from '@/src/domain/units';
import { calculateSessionMetrics } from '@/src/engine/calc/metrics';
import { useVolt } from '@/src/features/app/VoltProvider';
import { Body, Button, Card, Heading, Label, Strong } from '@/src/ui/components/primitives';
import { useTheme } from '@/src/ui/theme/ThemeProvider';

export default function SessionDetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const theme = useTheme();
  const router = useRouter();
  const { db } = useVolt();
  const session = db.sessions.get(sessionId as never);
  const intervals = db.intervals.listBySession(sessionId as never);
  if (!session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.bg, padding: 20 }}>
        <Heading>Missing session</Heading>
        <Button label="Back" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }
  const metrics = calculateSessionMetrics(session, intervals, session.endedAt ?? Date.now());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}>
        <Label>{new Date(session.endedAt ?? session.startedAt).toLocaleString()}</Label>
        <Heading>{session.workoutNameSnapshot}</Heading>
        <Body>
          {session.status} ·{' '}
          {isValue(metrics.workCompletionPercent)
            ? Units.formatPercent(metrics.workCompletionPercent.value)
            : 'Not enough data'}
        </Body>
        <Card>
          <Label>Intervals</Label>
          <View style={{ marginTop: 12, gap: 10 }}>
            {intervals.map((row) => (
              <View key={row.id}>
                <Strong>
                  R{row.roundIndex} {row.phase} · {row.exerciseNameSnapshot}
                </Strong>
                <Body style={{ color: theme.color.muted }}>
                  Planned {row.plannedSeconds}s · Actual {row.actualSeconds.toFixed(1)}s · {row.outcome}
                  {row.plannedReps != null ? ` · reps ${row.actualReps ?? 0}/${row.plannedReps}` : ''}
                </Body>
              </View>
            ))}
          </View>
        </Card>
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}
