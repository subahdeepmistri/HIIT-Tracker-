import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createId } from '@/src/domain/ids';
import type { WorkoutExercise } from '@/src/domain/types';
import { Units } from '@/src/domain/units';
import { validateWorkoutDraft } from '@/src/domain/validation';
import { plannedDurationForDraft } from '@/src/engine/workout/plannedDuration';
import { useVolt } from '@/src/features/app/VoltProvider';
import { BuilderExerciseCard } from '@/src/features/workouts/BuilderExerciseCard';
import { ExercisePicker } from '@/src/features/workouts/ExercisePicker';
import { confirmAction } from '@/src/ui/confirm';
import { Body, Button, Card, Heading, Label } from '@/src/ui/components/primitives';
import { goBackOr } from '@/src/ui/navigation';
import { useTheme } from '@/src/ui/theme/ThemeProvider';

export default function BuilderScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { db, settings } = useVolt();
  const existing = id ? db.workouts.plan(id as never) : null;
  const [name, setName] = useState(existing?.workout.name ?? '');
  const [notes, setNotes] = useState(existing?.workout.notes ?? '');
  const [rounds, setRounds] = useState(existing?.workout.rounds ?? settings.defaultRounds);
  const [items, setItems] = useState<WorkoutExercise[]>(
    existing?.exercises.map(({ exercise: _exercise, ...row }) => row) ?? [],
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  const duration = useMemo(
    () =>
      plannedDurationForDraft({
        name,
        rounds,
        countdownSeconds: settings.countdownSeconds,
        items,
      }),
    [name, rounds, items, settings.countdownSeconds],
  );

  function addExercises(exerciseIds: Array<WorkoutExercise['exerciseId']>) {
    const workoutId = (existing?.workout.id ?? createId()) as WorkoutExercise['workoutId'];
    const added: WorkoutExercise[] = [];
    for (const exerciseId of exerciseIds) {
      const exercise = db.exercises.get(exerciseId);
      if (!exercise) continue;
      added.push({
        id: createId(),
        workoutId,
        exerciseId,
        orderIndex: 0,
        trackingMode: exercise.trackingMode,
        plannedWorkSeconds: exercise.defaultWorkDurationSeconds || settings.defaultWorkSeconds,
        plannedRestSeconds: exercise.defaultRestDurationSeconds || settings.defaultRestSeconds,
        plannedReps: exercise.trackingMode === 'REPS' || exercise.trackingMode === 'HYBRID' ? 12 : undefined,
      });
    }
    setItems((current) =>
      [...current, ...added].map((row, index) => ({ ...row, orderIndex: index })),
    );
    setPickerOpen(false);
  }

  async function save() {
    const result = validateWorkoutDraft({ name, rounds, exercises: items });
    if (!result.ok) {
      Alert.alert('Cannot save', result.errors.join('\n'));
      return;
    }
    const workoutId = existing?.workout.id ?? createId();
    const now = Date.now();
    await db.workouts.upsert(
      {
        id: workoutId,
        name: name.trim(),
        notes,
        rounds,
        isArchived: false,
        createdAt: existing?.workout.createdAt ?? now,
        updatedAt: now,
      },
      items.map((item, index) => ({ ...item, workoutId, orderIndex: index })),
    );
    router.replace(`/workouts/${workoutId}`);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 48 }}>
        <Heading>{existing ? 'Edit workout' : 'New workout'}</Heading>
        <Field label="Name" value={name} onChange={setName} placeholder="Morning HIIT" />
        <Field label="Notes" value={notes} onChange={setNotes} placeholder="Optional" />
        <Card>
          <Label>Training time</Label>
          <Text
            style={{
              marginTop: 6,
              fontFamily: theme.type.display,
              color: theme.color.accent,
              fontSize: 40,
              lineHeight: 42,
            }}>
            {Units.formatCompactDuration(duration)}
          </Text>
          <Body style={{ marginTop: 8, color: theme.color.muted, fontSize: 15 }}>
            Work and rest between intervals. Countdown is not included.
          </Body>
          <View
            style={{
              marginTop: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 12,
              borderRadius: theme.radius.md,
              backgroundColor: theme.color.surface2,
              borderWidth: 1,
              borderColor: theme.color.line,
            }}>
            <Label>Rounds</Label>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Button label="−" variant="ghost" onPress={() => setRounds((value) => Math.max(1, value - 1))} />
              <Text style={{ fontFamily: theme.type.display, color: theme.color.text, fontSize: 28, lineHeight: 30 }}>
                {rounds}
              </Text>
              <Button label="+" variant="ghost" onPress={() => setRounds((value) => value + 1)} />
            </View>
          </View>
        </Card>

        {items.map((item, index) => (
          <BuilderExerciseCard
            key={item.id}
            index={index}
            item={item}
            exercise={db.exercises.get(item.exerciseId)}
            onChange={(patch) =>
              setItems((current) => current.map((row) => (row.id === item.id ? { ...row, ...patch } : row)))
            }
            onMove={(direction) =>
              setItems((current) => {
                const nextIndex = index + direction;
                if (nextIndex < 0 || nextIndex >= current.length) return current;
                const next = [...current];
                [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
                return next;
              })
            }
            onRemove={() => {
              void confirmAction(
                'Remove this exercise?',
                'It will leave this workout only. Other sessions are not changed.',
                'Yes, remove',
                { cancelLabel: 'Cancel', tone: 'danger' },
              ).then((ok) => {
                if (ok) setItems((current) => current.filter((row) => row.id !== item.id));
              });
            }}
          />
        ))}

        <Button label="Add exercises" variant="ghost" onPress={() => setPickerOpen(true)} />
        <ExercisePicker
          visible={pickerOpen}
          exercises={db.exercises.list()}
          onCancel={() => setPickerOpen(false)}
          onAdd={addExercises}
        />

        <Button label="Save workout" large onPress={() => void save()} />
        <Button label="Cancel" variant="ghost" onPress={() => goBackOr(router, '/workouts')} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const theme = useTheme();
  return (
    <View>
      <Label>{label}</Label>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.color.muted}
        style={{
          marginTop: 8,
          minHeight: 48,
          borderRadius: 16,
          paddingHorizontal: 16,
          backgroundColor: theme.color.surface,
          color: theme.color.text,
          fontFamily: theme.type.ui,
          fontSize: 16,
          borderWidth: 1,
          borderColor: theme.color.line,
        }}
      />
    </View>
  );
}
