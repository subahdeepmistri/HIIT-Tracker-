import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Units } from '@/src/domain/units';
import { dashboardStats, filterSessions, type RangeKey, trendPoints } from '@/src/engine/analytics/dashboard';
import { formatRecordValue, recordKindLabel } from '@/src/engine/records/personalRecords';
import { recoveryGuidance } from '@/src/engine/recovery/guidance';
import { useVolt } from '@/src/features/app/VoltProvider';
import { LineChart } from '@/src/ui/charts/LineChart';
import { Body, Card, EmptyState, Heading, Label, SegmentedControl, Stat, Strong } from '@/src/ui/components/primitives';
import { useTheme } from '@/src/ui/theme/ThemeProvider';

export default function ProgressScreen() {
  const theme = useTheme();
  const { db } = useVolt();
  const [range, setRange] = useState<RangeKey>('30');
  const now = Date.now();
  const sessions = filterSessions(db.sessions.list(), range, now);
  const performance = db.performance.list().filter((row) => sessions.some((session) => session.id === row.sessionId));
  const stats = dashboardStats(sessions, performance, now);
  const guidance = recoveryGuidance(
    db.sessions.list().map((session) => ({ session, intervals: db.intervals.listBySession(session.id) })),
    now,
  );
  const records = db.records.list();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 48 }}>
        <Heading>Progress</Heading>
        <SegmentedControl
          value={range}
          onChange={(value) => setRange(value as RangeKey)}
          options={[
            { label: '7D', value: '7' },
            { label: '30D', value: '30' },
            { label: '90D', value: '90' },
            { label: 'All', value: 'all' },
          ]}
        />

        {stats.workoutsCompleted === 0 && sessions.length === 0 ? (
          <EmptyState
            title="No recorded work"
            body="This dashboard only uses sessions you complete. Empty days stay empty — nothing is interpolated."
          />
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <Card style={{ flexGrow: 1, minWidth: '45%' }}>
                <Stat label="Workouts" value={String(stats.workoutsCompleted)} />
              </Card>
              <Card style={{ flexGrow: 1, minWidth: '45%' }}>
                <Stat label="Training time" value={Units.formatCompactDuration(stats.totalTrainingSeconds)} />
              </Card>
              <Card style={{ flexGrow: 1, minWidth: '45%' }}>
                <Stat label="Active time" value={Units.formatCompactDuration(stats.totalActiveSeconds)} />
              </Card>
              <Card style={{ flexGrow: 1, minWidth: '45%' }}>
                <Stat
                  label="Avg duration"
                  value={
                    stats.averageDurationSeconds == null
                      ? 'Not enough data'
                      : Units.formatCompactDuration(stats.averageDurationSeconds)
                  }
                />
              </Card>
              <Card style={{ flexGrow: 1, minWidth: '45%' }}>
                <Stat
                  label="Avg completion"
                  value={stats.averageCompletion == null ? 'Not enough data' : Units.formatPercent(stats.averageCompletion)}
                />
              </Card>
              <Card style={{ flexGrow: 1, minWidth: '45%' }}>
                <Stat label="Streak" value={`${stats.streak} day${stats.streak === 1 ? '' : 's'}`} />
              </Card>
            </View>

            <Card>
              <Label>Duration</Label>
              <LineChart
                points={trendPoints(db.sessions.list(), db.performance.list(), range, now, 'duration')}
                accessibilityLabel="Workout duration trend"
                formatValue={(value) => Units.formatCompactDuration(value)}
              />
            </Card>
            <Card>
              <Label>Completion %</Label>
              <LineChart
                points={trendPoints(db.sessions.list(), db.performance.list(), range, now, 'completion')}
                accessibilityLabel="Completion percentage trend"
                formatValue={(value) => Units.formatPercent(value)}
              />
            </Card>
            <Card>
              <Label>Active time</Label>
              <LineChart
                points={trendPoints(db.sessions.list(), db.performance.list(), range, now, 'active')}
                accessibilityLabel="Active time trend"
                formatValue={(value) => Units.formatCompactDuration(value)}
              />
            </Card>
            <Card>
              <Label>Repetitions</Label>
              <LineChart
                points={trendPoints(db.sessions.list(), db.performance.list(), range, now, 'reps')}
                accessibilityLabel="Repetition trend"
                formatValue={(value) => `${Math.round(value)}`}
              />
            </Card>
          </>
        )}

        <Card>
          <Label>Heart rate</Label>
          <Body style={{ marginTop: 8 }}>Heart-rate data unavailable</Body>
        </Card>

        {guidance ? (
          <Card>
            <Label>Training suggestion</Label>
            <Heading style={{ fontSize: 28, lineHeight: 30, marginTop: 8 }}>{guidance.title}</Heading>
            <Body style={{ marginTop: 8 }}>{guidance.body}</Body>
            <Body style={{ marginTop: 8, color: theme.color.muted, fontSize: 13 }}>{guidance.disclaimer}</Body>
          </Card>
        ) : null}

        <Card>
          <Label>Personal records</Label>
          {records.length === 0 ? (
            <Body style={{ marginTop: 8 }}>No PRs yet. Records are created only from valid recorded data.</Body>
          ) : (
            <View style={{ marginTop: 12, gap: 10 }}>
              {records.map((record) => (
                <View key={record.id}>
                  <Strong>{recordKindLabel(record.kind)}</Strong>
                  <Body style={{ color: theme.color.muted }}>{formatRecordValue(record)}</Body>
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
