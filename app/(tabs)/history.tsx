import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Units } from '@/src/domain/units';
import { useVolt } from '@/src/features/app/VoltProvider';
import { confirmAndDeleteSession } from '@/src/features/history/deleteSession';
import { SessionListRow } from '@/src/features/history/SessionListRow';
import { Button, EmptyState, Heading } from '@/src/ui/components/primitives';
import { useTheme } from '@/src/ui/theme/ThemeProvider';

export default function HistoryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { db } = useVolt();
  const sessions = db.sessions
    .list()
    .filter((row) => row.status === 'COMPLETED' || row.status === 'PARTIAL');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Heading>History</Heading>
          <Button label="Calendar" variant="ghost" onPress={() => router.push('/calendar')} />
        </View>
        {sessions.length === 0 ? (
          <EmptyState
            title="No sessions yet"
            body="Completed and partial workouts will land here. Nothing is invented to fill this list."
          />
        ) : (
          sessions.map((session) => {
            const record = db.performance.getBySession(session.id);
            return (
              <SessionListRow
                key={session.id}
                badge={session.status === 'PARTIAL' ? 'Partial' : 'Completed'}
                title={session.workoutNameSnapshot}
                subtitle={[
                  new Date(session.endedAt ?? session.startedAt).toLocaleString(),
                  record ? Units.formatCompactDuration(record.totalDurationSeconds) : null,
                  record?.workCompletionPercent != null ? Units.formatPercent(record.workCompletionPercent) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                onOpen={() => router.push(`/history/${session.id}`)}
                onDelete={() => void confirmAndDeleteSession(db, session.id)}
              />
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
