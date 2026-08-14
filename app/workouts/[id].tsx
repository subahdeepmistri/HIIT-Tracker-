import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Units } from '@/src/domain/units';
import { planWorkout } from '@/src/engine/workout/planner';
import { useVolt } from '@/src/features/app/VoltProvider';
import { Body, Button, Card, Heading, Label, Strong } from '@/src/ui/components/primitives';
import { useTheme } from '@/src/ui/theme/ThemeProvider';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const { db, controller, settings } = useVolt();
  const plan = db.workouts.plan(id as never);
  if (!plan) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.bg, padding: 20 }}>
        <Heading>Workout missing</Heading>
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }
  const planned = planWorkout({
    workout: plan.workout,
    items: plan.exercises,
    countdownSeconds: settings.countdownSeconds,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
        <Label>Pre-workout</Label>
        <Heading>{plan.workout.name}</Heading>
        {plan.workout.notes ? <Body>{plan.workout.notes}</Body> : null}
        <Card>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            <Fact label="Exercises" value={String(planned.exerciseCount)} />
            <Fact label="Rounds" value={String(planned.rounds)} />
            <Fact label="Duration" value={Units.formatCompactDuration(planned.plannedDurationSeconds)} />
            <Fact label="Work" value={Units.formatCompactDuration(planned.plannedWorkSeconds)} />
            <Fact label="Rest" value={Units.formatCompactDuration(planned.plannedRestSeconds)} />
          </View>
        </Card>
        <Card>
          <Label>Exercises</Label>
          <View style={{ marginTop: 12, gap: 12 }}>
            {plan.exercises.map((item, index) => (
              <View key={item.id}>
                <Strong>
                  {index + 1}. {item.exercise.name}
                </Strong>
                <Body style={{ color: theme.color.muted }}>
                  {item.plannedWorkSeconds}s work · {item.plannedRestSeconds}s rest
                  {item.plannedReps ? ` · target ${item.plannedReps} reps` : ''}
                  {item.plannedDistance ? ` · ${item.plannedDistance} ${item.distanceUnit ?? ''}` : ''}
                </Body>
              </View>
            ))}
          </View>
        </Card>
        <Button
          label="Start workout"
          large
          onPress={async () => {
            const state = await controller.start(plan, settings.countdownSeconds, settings.reducedMotion);
            router.replace(`/live/${state.sessionId}`);
          }}
        />
        <Button
          label="Edit"
          variant="ghost"
          onPress={() => router.push({ pathname: '/workouts/builder', params: { id: plan.workout.id } })}
        />
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ minWidth: 90 }}>
      <Label>{label}</Label>
      <Strong style={{ marginTop: 4 }}>{value}</Strong>
    </View>
  );
}
