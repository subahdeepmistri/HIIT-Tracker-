import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Units } from '@/src/domain/units';
import { planWorkout } from '@/src/engine/workout/planner';
import { useVolt } from '@/src/features/app/VoltProvider';
import { Body, Button, Card, EmptyState, Heading, Label, Strong } from '@/src/ui/components/primitives';
import { useTheme } from '@/src/ui/theme/ThemeProvider';

export default function WorkoutsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { db } = useVolt();
  const workouts = db.workouts.list();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Heading>Workouts</Heading>
          <Button label="New" onPress={() => router.push('/workouts/builder')} />
        </View>
        <Button label="Exercise library" variant="ghost" onPress={() => router.push('/exercises')} />

        {workouts.length === 0 ? (
          <EmptyState
            title="No workouts yet"
            body="Build a session with work and rest intervals. Planned values stay intact after you train."
            action={<Button label="Create workout" onPress={() => router.push('/workouts/builder')} />}
          />
        ) : (
          workouts.map((workout) => {
            const plan = db.workouts.plan(workout.id);
            if (!plan) return null;
            const planned = planWorkout({
              workout: plan.workout,
              items: plan.exercises,
              countdownSeconds: db.settings.get().countdownSeconds,
            });
            return (
              <Pressable key={workout.id} onPress={() => router.push(`/workouts/${workout.id}`)}>
                <Card>
                  <Strong style={{ fontSize: 20 }}>{workout.name}</Strong>
                  <Body style={{ color: theme.color.muted, marginTop: 6 }}>
                    {Units.formatCompactDuration(planned.plannedDurationSeconds)} · {workout.rounds} rounds ·{' '}
                    {plan.exercises.length} exercises
                  </Body>
                  <View style={{ marginTop: 12, gap: 4 }}>
                    {plan.exercises.slice(0, 4).map((item) => (
                      <Label key={item.id}>
                        {item.orderIndex + 1}. {item.exercise.name} · {item.plannedWorkSeconds}s work /{' '}
                        {item.plannedRestSeconds}s rest
                      </Label>
                    ))}
                  </View>
                </Card>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
