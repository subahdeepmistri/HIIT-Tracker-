import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Units } from '@/src/domain/units';
import type { IntervalSession } from '@/src/domain/types';
import {
  dashboardStats,
  filterSessions,
  indexPerformance,
  trendPointSets,
  type RangeKey,
} from '@/src/engine/analytics/dashboard';
import { aggregateSessionProgress, buildSessionProgress } from '@/src/engine/analytics/sessionProgress';
import { formatRecordValue, recordKindLabel } from '@/src/engine/records/personalRecords';
import { recoveryGuidance } from '@/src/engine/recovery/guidance';
import { useVolt } from '@/src/features/app/VoltProvider';
import { LineChart } from '@/src/ui/charts/LineChart';
import { RecordedCompletionCard } from '@/src/ui/components/RecordedCompletion';
import { Body, Card, EmptyState, Heading, Label, SegmentedControl, Stat, Strong } from '@/src/ui/components/primitives';
import { useTheme } from '@/src/ui/theme/ThemeProvider';

const EMPTY_INTERVALS: IntervalSession[] = [];

export default function ProgressScreen() {
  const theme = useTheme();
  const { db } = useVolt();
  const [range, setRange] = useState<RangeKey>('30');
  const now = Date.now();
  const allSessions = db.sessions.list();
  const allPerformance = db.performance.list();
  // One O(I) grouping pass per render replaces repeated full-interval scans.
  const intervalsBySession = new Map<string, IntervalSession[]>();
  for (const row of db.intervals.listAll()) {
    const list = intervalsBySession.get(row.sessionId);
    if (list) list.push(row);
    else intervalsBySession.set(row.sessionId, [row]);
  }
  const intervalsFor = (sessionId: string): IntervalSession[] =>
    intervalsBySession.get(sessionId) ?? EMPTY_INTERVALS;

  const sessions = filterSessions(allSessions, range, now);
  // O(p) map join replaces the O(n·p) `.some()` filter.
  const perfById = indexPerformance(allPerformance);
  const performance = sessions
    .map((s) => perfById.get(s.id))
    .filter((row): row is NonNullable<typeof row> => row != null);

  const stats = dashboardStats(sessions, performance, now);
  const recorded = aggregateSessionProgress(
    sessions.map((session) =>
      buildSessionProgress(session, intervalsFor(session.id), session.endedAt ?? now),
    ),
  );
  const guidance = recoveryGuidance(
    allSessions.map((session) => ({ session, intervals: intervalsFor(session.id) })),
    now,
  );
  const records = db.records.list();
  const emptyRange = stats.sessionsRecorded === 0;
  const trends = trendPointSets(allSessions, allPerformance, range, now, [
    'duration',
    'completion',
    'active',
    'rest',
    'reps',
    'score',
    'distance',
  ]);
  const durationTrend = trends.duration;
  const completionTrend = trends.completion;
  const activeTrend = trends.active;
  const restTrend = trends.rest;
  const repsTrend = trends.reps;
  const scoreTrend = trends.score;
  const distanceTrend = trends.distance;

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
                  label="Intervals"
                  value={
                    stats.totalCompletedIntervals > 0 ? String(stats.totalCompletedIntervals) : 'Not enough data'
                  }
                />
              </Card>
              <Card style={{ flexGrow: 1, minWidth: '45%' }}>
                <Stat
                  label="Exercises"
                  value={stats.totalExercises > 0 ? String(stats.totalExercises) : 'Not enough data'}
                />
              </Card>
              <Card style={{ flexGrow: 1, minWidth: '45%' }}>
                <Stat
                  label="Total reps"
                  value={stats.totalReps == null ? 'Not enough data' : String(stats.totalReps)}
                />
              </Card>
            </View>

            <RecordedCompletionCard
              footnote="Every bar is rebuilt from this range’s interval rows. Missing inputs stay empty — nothing is interpolated."
              tracks={recorded.tracks}
              scoreParts={recorded.scoreParts}
              workRest={recorded.workRest}
            />

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
            {distanceTrend.length > 0 ? (
              <TrendCard
                title="Distance completion"
                points={distanceTrend}
                formatValue={(value) => Units.formatPercent(value)}
                label="Distance completion trend"
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
