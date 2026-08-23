import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isValue } from '@/src/domain/metrics';
import { Units } from '@/src/domain/units';
import { buildSessionProgress } from '@/src/engine/analytics/sessionProgress';
import { calculateSessionMetrics } from '@/src/engine/calc/metrics';
import { useVolt } from '@/src/features/app/VoltProvider';
import { confirmAndDeleteSession } from '@/src/features/history/deleteSession';
import { RecordedCompletionCard } from '@/src/ui/components/RecordedCompletion';
import { Body, Button, Card, Heading, Label, Strong } from '@/src/ui/components/primitives';
import { goBackOr } from '@/src/ui/navigation';
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
        <Button label="Back" onPress={() => goBackOr(router, '/history')} />
      </SafeAreaView>
    );
  }
  const metrics = calculateSessionMetrics(session, intervals, session.endedAt ?? Date.now());
  const recorded = buildSessionProgress(session, intervals, session.endedAt ?? Date.now());

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
        <RecordedCompletionCard
          footnote="Rebuilt from this session’s interval rows. Missing inputs stay empty."
          tracks={recorded.tracks}
          scoreParts={recorded.scoreParts}
          workRest={recorded.workRest}
          intervals={recorded.intervals}
        />
        <Card>
          <Label>All intervals</Label>
          <View style={{ marginTop: 12, gap: 10 }}>
            {intervals.map((row) => (
              <View key={row.id}>
                <Strong>
                  R{row.roundIndex} {row.phase} · {row.exerciseNameSnapshot}
                </Strong>
                <Body style={{ color: theme.color.muted }}>{row.outcome}</Body>
              </View>
            ))}
          </View>
        </Card>
        <Button
          label="Delete session"
          variant="danger"
          onPress={async () => {
            const deleted = await confirmAndDeleteSession(db, session.id);
            if (deleted) goBackOr(router, '/history');
          }}
        />
        <Button label="Back" variant="ghost" onPress={() => goBackOr(router, '/history')} />
      </ScrollView>
    </SafeAreaView>
  );
}
