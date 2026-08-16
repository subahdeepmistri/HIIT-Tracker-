import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { planWorkout } from '@/src/engine/workout/planner';
import { useVolt } from '@/src/features/app/VoltProvider';
import { PreWorkoutView } from '@/src/features/workouts/PreWorkoutView';
import { Button, Heading } from '@/src/ui/components/primitives';
import { goBackOr } from '@/src/ui/navigation';
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
        <Button label="Back" variant="ghost" onPress={() => goBackOr(router, '/workouts')} />
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
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <PreWorkoutView
          name={plan.workout.name}
          notes={plan.workout.notes}
          exerciseCount={planned.exerciseCount}
          rounds={planned.rounds}
          durationSeconds={planned.plannedDurationSeconds}
          workSeconds={planned.plannedWorkSeconds}
          restSeconds={planned.plannedRestSeconds}
          countdownSeconds={settings.countdownSeconds}
          items={plan.exercises}
          onStart={async () => {
            const state = await controller.start(plan, settings.countdownSeconds, settings.reducedMotion);
            router.replace(`/live/${state.sessionId}`);
          }}
          onEdit={() => router.push({ pathname: '/workouts/builder', params: { id: plan.workout.id } })}
          onBack={() => goBackOr(router, '/workouts')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
