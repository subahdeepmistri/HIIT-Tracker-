import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Units } from '@/src/domain/units';
import { dashboardStats, filterSessions, type RangeKey, trendPoints } from '@/src/engine/analytics/dashboard';
import { formatRecordValue, recordKindLabel } from '@/src/engine/records/personalRecords';
import { recoveryGuidance } from '@/src/engine/recovery/guidance';
import { useVolt } from '@/src/features/app/VoltProvider';
import { LineChart } from '@/src/ui/charts/LineChart';
import { ProgressTrack } from '@/src/ui/components/ProgressTrack';
import { Body, Card, EmptyState, Heading, Label, SegmentedControl, Stat, Strong } from '@/src/ui/components/primitives';
import { useTheme } from '@/src/ui/theme/ThemeProvider';

export default function ProgressScreen() {
  const theme = useTheme();
  const { db } = useVolt();
  const [range, setRange] = useState<RangeKey>('30');
  const now = Date.now();
  const allSessions = db.sessions.list();
  const allPerformance = db.performance.list();
  const sessions = filterSessions(allSessions, range, now);
  const performance = allPerformance.filter((row) => sessions.some((session) => session.id === row.sessionId));
  const stats = dashboardStats(sessions, performance, now);
  const guidance = recoveryGuidance(
    allSessions.map((session) => ({ session, intervals: db.intervals.listBySession(session.id) })),
    now,
  );
  const records = db.records.list();
  const emptyRange = stats.sessionsRecorded === 0;
  const durationTrend = trendPoints(allSessions, allPerformance, range, now, 'duration');
  const completionTrend = trendPoints(allSessions, allPerformance, range, now, 'completion');
  const activeTrend = trendPoints(allSessions, allPerformance, range, now, 'active');
  const restTrend = trendPoints(allSessions, allPerformance, range, now, 'rest');
  const repsTrend = trendPoints(allSessions, allPerformance, range, now, 'reps');
  const scoreTrend = trendPoints(allSessions, allPerformance, range, now, 'score');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 48 }}>
        <Heading>Progress</Heading>
        <Body style={{ color: theme.color.muted }}>
          Built from recorded sessions only. Missing metrics stay empty.
        </Body>
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

        {emptyRange ? (
          <EmptyState
            title="No recorded work"
            body="This range has no completed or partial sessions. Empty days stay empty — nothing is interpolated."
          />
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <Card style={{ flexGrow: 1, minWidth: '45%' }}>
                <Stat
                  label="Completed"
                  value={String(stats.workoutsCompleted)}
                  hint={stats.partialWorkouts ? `${stats.partialWorkouts} partial` : undefined}
                />
              </Card>
              <Card style={{ flexGrow: 1, minWidth: '45%' }}>
                <Stat label="Training time" value={Units.formatCompactDuration(stats.totalTrainingSeconds)} />
              </Card>
              <Card style={{ flexGrow: 1, minWidth: '45%' }}>
                <Stat label="Active time" value={Units.formatCompactDuration(stats.totalActiveSeconds)} />
              </Card>
              <Card style={{ flexGrow: 1, minWidth: '45%' }}>
                <Stat label="Rest time" value={Units.formatCompactDuration(stats.totalRestSeconds)} />
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
                <Stat label="Streak" value={`${stats.streak} day${stats.streak === 1 ? '' : 's'}`} />
              </Card>
              <Card style={{ flexGrow: 1, minWidth: '45%' }}>
                <Stat
                  label="Rounds"
                  value={stats.totalRounds > 0 ? String(stats.totalRounds) : 'Not enough data'}
                />
              </Card>
              <Card style={{ flexGrow: 1, minWidth: '45%' }}>
                <Stat
                  label="Total reps"
                  value={stats.totalReps == null ? 'Not enough data' : String(stats.totalReps)}
                />
              </Card>
            </View>

            <Card>
              <Label>Recorded completion</Label>
              <Body style={{ color: theme.color.muted, fontSize: 13, marginTop: 6, marginBottom: 14 }}>
                Averages from stored interval rows in this range.
              </Body>
              <View style={{ gap: 16 }}>
                <ProgressTrack
                  label="Work"
                  detail={
                    stats.averageCompletion == null ? 'Not enough data' : Units.formatPercent(stats.averageCompletion)
                  }
                  value={stats.averageCompletion == null ? null : stats.averageCompletion / 100}
                />
                <ProgressTrack
                  label="Intervals"
                  detail={
                    stats.averageIntervalCompletion == null
                      ? 'Not enough data'
                      : Units.formatPercent(stats.averageIntervalCompletion)
                  }
                  value={stats.averageIntervalCompletion == null ? null : stats.averageIntervalCompletion / 100}
                />
                <ProgressTrack
                  label="Reps"
                  detail={
                    stats.averageRepCompletion == null
                      ? 'Not enough data'
                      : Units.formatPercent(stats.averageRepCompletion)
                  }
                  value={stats.averageRepCompletion == null ? null : stats.averageRepCompletion / 100}
                />
                <ProgressTrack
                  label="Performance"
                  detail={
                    stats.averageScore == null ? 'Not enough data' : String(Math.round(stats.averageScore))
                  }
                  value={stats.averageScore == null ? null : stats.averageScore / 100}
                />
              </View>
              <View style={{ marginTop: 18 }}>
                <Label>Work : Rest</Label>
                <Strong style={{ fontFamily: theme.type.display, fontSize: 32, marginTop: 6 }}>
                  {stats.averageWorkRestRatio == null ? 'Not enough data' : Units.formatRatio(stats.averageWorkRestRatio)}
                </Strong>
              </View>
            </Card>

            <TrendCard
              title="Duration"
              points={durationTrend}
              formatValue={(value) => Units.formatCompactDuration(value)}
              label="Workout duration trend"
            />
            <TrendCard
              title="Work completion"
              points={completionTrend}
              formatValue={(value) => Units.formatPercent(value)}
              label="Completion percentage trend"
            />
            <TrendCard
              title="Active time"
              points={activeTrend}
              formatValue={(value) => Units.formatCompactDuration(value)}
              label="Active time trend"
            />
            <TrendCard
              title="Rest time"
              points={restTrend}
              formatValue={(value) => Units.formatCompactDuration(value)}
              label="Rest time trend"
            />
            {repsTrend.length > 0 ? (
              <TrendCard
                title="Repetitions"
                points={repsTrend}
                formatValue={(value) => `${Math.round(value)}`}
                label="Repetition trend"
              />
            ) : null}
            {scoreTrend.length > 0 ? (
              <TrendCard
                title="Performance score"
                points={scoreTrend}
                formatValue={(value) => String(Math.round(value))}
                label="Performance score trend"
              />
            ) : null}
          </>
        )}

        <Card>
          <Label>Heart rate</Label>
          <Body style={{ marginTop: 8 }}>No compatible heart-rate sensor is connected.</Body>
          <Body style={{ marginTop: 6, color: theme.color.muted, fontSize: 13 }}>
            Connect a supported device to see heart-rate data during workouts. This app never estimates heart rate.
          </Body>
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

function TrendCard({
  title,
  points,
  formatValue,
  label,
}: {
  title: string;
  points: Array<{ label: string; value: number }>;
  formatValue: (value: number) => string;
  label: string;
}) {
  return (
    <Card>
      <Label>{title}</Label>
      <LineChart points={points} accessibilityLabel={label} formatValue={formatValue} />
    </Card>
  );
}
