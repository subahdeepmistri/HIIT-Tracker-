import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isValue } from '@/src/domain/metrics';
import { Units } from '@/src/domain/units';
import { calculateSessionMetrics } from '@/src/engine/calc/metrics';
import { formatRecordValue, recordKindLabel } from '@/src/engine/records/personalRecords';
import { scoreFromMetrics } from '@/src/engine/score/performanceScore';
import { useVolt } from '@/src/features/app/VoltProvider';
import { Body, Button, Card, Heading, Label, Stat, Strong } from '@/src/ui/components/primitives';
import { useTheme } from '@/src/ui/theme/ThemeProvider';

export default function SummaryScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const theme = useTheme();
  const router = useRouter();
  const { db } = useVolt();
  const session = db.sessions.get(sessionId as never);
  const intervals = db.intervals.listBySession(sessionId as never);
  const record = db.performance.getBySession(sessionId as never);
  const newRecords = db.records.list().filter((row) => row.sessionId === sessionId);

  if (!session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.bg, padding: 20 }}>
        <Heading>Session missing</Heading>
        <Button label="Home" onPress={() => router.replace('/')} />
      </SafeAreaView>
    );
  }

  const metrics = calculateSessionMetrics(session, intervals, session.endedAt ?? Date.now());
  const score = scoreFromMetrics(metrics, session.plannedRounds);
  const work = intervals.filter((row) => row.phase === 'WORK');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 48 }}>
        <Label>{session.status === 'PARTIAL' ? 'Partial session' : 'Workout complete'}</Label>
        <Heading>Great work.</Heading>
        <TextHero
          value={
            isValue(metrics.totalDurationSeconds)
              ? Units.formatSeconds(metrics.totalDurationSeconds.value)
              : 'Not enough data'
          }
          label="Total duration"
        />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Card style={{ minWidth: '45%', flexGrow: 1 }}>
            <Stat
              label="Active time"
              value={
                isValue(metrics.totalActiveSeconds)
                  ? Units.formatCompactDuration(metrics.totalActiveSeconds.value)
                  : 'Not enough data'
              }
            />
          </Card>
          <Card style={{ minWidth: '45%', flexGrow: 1 }}>
            <Stat
              label="Rest time"
              value={
                isValue(metrics.totalRestSeconds)
                  ? Units.formatCompactDuration(metrics.totalRestSeconds.value)
                  : 'Not enough data'
              }
            />
          </Card>
          <Card style={{ minWidth: '45%', flexGrow: 1 }}>
            <Stat
              label="Exercises"
              value={isValue(metrics.exerciseCount) ? String(metrics.exerciseCount.value) : 'Not enough data'}
            />
          </Card>
          <Card style={{ minWidth: '45%', flexGrow: 1 }}>
            <Stat
              label="Rounds"
              value={isValue(metrics.completedRounds) ? String(metrics.completedRounds.value) : 'Not enough data'}
            />
          </Card>
          <Card style={{ minWidth: '45%', flexGrow: 1 }}>
            <Stat
              label="Total reps"
              value={isValue(metrics.totalReps) ? String(metrics.totalReps.value) : 'Not enough data'}
            />
          </Card>
          <Card style={{ minWidth: '45%', flexGrow: 1 }}>
            <Stat
              label="Completion"
              value={
                isValue(metrics.workCompletionPercent)
                  ? Units.formatPercent(metrics.workCompletionPercent.value)
                  : 'Not enough data'
              }
            />
          </Card>
        </View>

        <Card>
          <Label>Work : Rest</Label>
          {isValue(metrics.workRest) ? (
            <>
              <Heading style={{ fontSize: 32, marginTop: 8 }}>{metrics.workRest.value.display}</Heading>
              <Body style={{ marginTop: 6 }}>{metrics.workRest.value.label}</Body>
              <Body style={{ marginTop: 4, color: theme.color.muted, fontSize: 13 }}>
                Training interpretation — not a medical classification.
              </Body>
            </>
          ) : (
            <Body style={{ marginTop: 8 }}>Not enough data</Body>
          )}
        </Card>

        <Card>
          <Label>Performance score</Label>
          {isValue(score) ? (
            <>
              <Heading style={{ fontSize: 48, marginTop: 8 }}>{Math.round(score.value.total)}</Heading>
              {score.value.components.map((component) => (
                <Body key={component.key} style={{ color: theme.color.muted, marginTop: 4 }}>
                  {component.label} {Units.formatPercent(component.score)} · weight{' '}
                  {Units.formatPercent(component.renormalizedWeight * 100)}
                </Body>
              ))}
            </>
          ) : (
            <Body style={{ marginTop: 8 }}>Not enough data</Body>
          )}
        </Card>

        <Card>
          <Label>Best / weakest interval</Label>
          {isValue(metrics.bestInterval) ? (
            <Body style={{ marginTop: 8 }}>
              Best {metrics.bestInterval.value.exerciseNameSnapshot} · {metrics.bestInterval.value.actualSeconds}s /{' '}
              {metrics.bestInterval.value.plannedSeconds}s
            </Body>
          ) : (
            <Body style={{ marginTop: 8 }}>Not enough data</Body>
          )}
          {isValue(metrics.weakestInterval) ? (
            <Body style={{ marginTop: 4 }}>
              Weakest {metrics.weakestInterval.value.exerciseNameSnapshot} · {metrics.weakestInterval.value.actualSeconds}s
              / {metrics.weakestInterval.value.plannedSeconds}s
            </Body>
          ) : null}
        </Card>

        <Card>
          <Label>Planned vs actual</Label>
          <View style={{ marginTop: 12, gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Label>Planned</Label>
              <Label>Actual</Label>
            </View>
            {work.map((row) => (
              <View key={row.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Body>
                  {row.exerciseNameSnapshot} · {row.plannedSeconds}s
                </Body>
                <Strong>{row.actualSeconds.toFixed(1)}s</Strong>
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <Label>Heart rate</Label>
          <Body style={{ marginTop: 8 }}>Heart-rate data unavailable</Body>
        </Card>

        {newRecords.length > 0 ? (
          <Card>
            <Label>New personal records</Label>
            {newRecords.map((row) => (
              <Body key={row.id} style={{ marginTop: 6 }}>
                {recordKindLabel(row.kind)} · {formatRecordValue(row)}
              </Body>
            ))}
          </Card>
        ) : null}

        {record ? (
          <Body style={{ color: theme.color.muted, fontSize: 13 }}>
            Score and completion are derived from stored interval rows. Planned template values were not changed.
          </Body>
        ) : null}

        <Button label="Done" large onPress={() => router.replace('/')} />
      </ScrollView>
    </SafeAreaView>
  );
}

function TextHero({ value, label }: { value: string; label: string }) {
  const theme = useTheme();
  return (
    <View>
      <Text style={{ fontFamily: theme.type.display, color: theme.color.accent, fontSize: 72, lineHeight: 74 }}>
        {value}
      </Text>
      <Label>{label}</Label>
    </View>
  );
}
