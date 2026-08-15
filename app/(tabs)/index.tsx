import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { weekStats, greeting } from '@/src/engine/analytics/dashboard';
import { planWorkout } from '@/src/engine/workout/planner';
import { useVolt } from '@/src/features/app/VoltProvider';
import { Body, Button, Card, EmptyState, Heading, Label, Strong } from '@/src/ui/components/primitives';
import { useTheme } from '@/src/ui/theme/ThemeProvider';
import { Units } from '@/src/domain/units';
import { confirmAction } from '@/src/ui/confirm';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { db, controller, revision } = useVolt();
  const [now] = useState(() => new Date());
  const sessions = db.sessions.list();
  const performance = db.performance.list();
  const week = weekStats(sessions, performance, now.getTime());
  const workouts = db.workouts.list();
  const last = sessions[0];
  const featured = (last && db.workouts.get(last.workoutId)) || workouts[0];
  const plan = featured ? db.workouts.plan(featured.id) : null;
  const planned = plan
    ? planWorkout({
        workout: plan.workout,
        items: plan.exercises,
        countdownSeconds: db.settings.get().countdownSeconds,
      })
    : null;
  const interrupted = db.sessions.inProgress();

  useFocusEffect(
    useCallback(() => {
      void revision;
    }, [revision]),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 20 }}>
        <View>
          <Label>{greeting(now)}</Label>
          <Heading style={{ marginTop: 6 }}>Ready to train?</Heading>
        </View>

        {interrupted ? (
          <Card style={{ borderColor: theme.color.warn, borderWidth: 1 }}>
            <Label>Interrupted session</Label>
            <Strong style={{ marginTop: 6 }}>{interrupted.workoutNameSnapshot}</Strong>
            <Body style={{ marginTop: 6, color: theme.color.muted }}>
              This workout did not finish. Resume, save what you did, or discard it.
            </Body>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
              <Button
                label="Resume"
                onPress={async () => {
                  await controller.hydrateFromStorage();
                  router.push(`/live/${interrupted.id}`);
                }}
              />
              <Button
                label="Save partial"
                variant="ghost"
                onPress={async () => {
                  await controller.hydrateFromStorage();
                  const result = await controller.savePartial();
                  router.push(`/summary/${result.session.id}`);
                }}
              />
              <Button
                label="Discard"
                variant="danger"
                onPress={async () => {
                  const ok = await confirmAction(
                    'Discard session?',
                    'Recorded intervals from this run will be deleted.',
                    'Discard',
                  );
                  if (!ok) return;
                  await controller.discard(interrupted.id);
                }}
              />
            </View>
          </Card>
        ) : null}

        {plan && planned ? (
          <Card style={{ backgroundColor: theme.color.surface, gap: 8 }}>
            <Label>Today’s workout</Label>
            <Heading style={{ fontSize: 36, lineHeight: 38 }}>{plan.workout.name}</Heading>
            <Body style={{ color: theme.color.muted }}>
              {Units.formatCompactDuration(planned.plannedDurationSeconds)} · {planned.rounds} rounds ·{' '}
              {planned.exerciseCount} exercises
            </Body>
            <View style={{ marginTop: 12 }}>
              <Button
                label="Start"
                large
                accessibilityHint={`Open ${plan.workout.name}`}
                onPress={() => router.push(`/workouts/${plan.workout.id}`)}
              />
            </View>
          </Card>
        ) : (
          <EmptyState
            title="Build a session"
            body="Create a HIIT workout to start tracking planned versus actual work."
            action={<Button label="Create workout" onPress={() => router.push('/workouts/builder')} />}
          />
        )}

        {week.workoutsCompleted > 0 ? (
          <Card>
            <Label>Your progress · this week</Label>
            <View style={{ flexDirection: 'row', marginTop: 16, gap: 12 }}>
              <MiniStat label="Workouts" value={String(week.workoutsCompleted)} />
              <MiniStat label="Active" value={Units.formatCompactDuration(week.totalActiveSeconds)} />
              <MiniStat
                label="Completion"
                value={week.averageCompletion == null ? '—' : Units.formatPercent(week.averageCompletion)}
              />
            </View>
          </Card>
        ) : (
          <Card>
            <Label>Your progress</Label>
            <Body style={{ marginTop: 8 }}>
              No sessions recorded this week. Stats appear after you complete a workout.
            </Body>
          </Card>
        )}

        <View>
          <Label>Recent workouts</Label>
          {sessions.filter((row) => row.status !== 'IN_PROGRESS' && row.status !== 'CANCELLED').length === 0 ? (
            <Card style={{ marginTop: 12 }}>
              <Label>Your first session</Label>
              <Body style={{ marginTop: 8, color: theme.color.muted }}>
                Complete your first workout to unlock your training history, progress trends, and personal records.
              </Body>
              <View style={{ marginTop: 16 }}>
                <Button
                  label="Start Morning HIIT"
                  onPress={() => router.push('/workouts/wo-morning-hiit')}
                />
              </View>
            </Card>
          ) : (
            <View style={{ marginTop: 12, gap: 10 }}>
              {sessions
                .filter((row) => row.status !== 'IN_PROGRESS' && row.status !== 'CANCELLED')
                .slice(0, 4)
                .map((session) => {
                  const record = db.performance.getBySession(session.id);
                  return (
                    <Pressable
                      key={session.id}
                      onPress={() => router.push(`/history/${session.id}`)}
                      style={{
                        backgroundColor: theme.color.surface,
                        borderRadius: 16,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: theme.color.line,
                      }}>
                      <Strong>{session.workoutNameSnapshot}</Strong>
                      <Body style={{ color: theme.color.muted, marginTop: 4 }}>
                        {new Date(session.endedAt ?? session.startedAt).toLocaleDateString()}
                        {record ? ` · ${Units.formatCompactDuration(record.totalDurationSeconds)}` : ''}
                        {record?.workCompletionPercent != null
                          ? ` · ${Units.formatPercent(record.workCompletionPercent)}`
                          : ''}
                      </Body>
                    </Pressable>
                  );
                })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Label>{label}</Label>
      <Strong style={{ marginTop: 4, fontFamily: theme.type.display, fontSize: 24 }}>{value}</Strong>
    </View>
  );
}
