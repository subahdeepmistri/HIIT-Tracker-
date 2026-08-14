import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createId } from '@/src/domain/ids';
import type { TrackingMode, WorkoutExercise } from '@/src/domain/types';

const TRACKING_MODES: TrackingMode[] = ['TIME', 'REPS', 'DISTANCE', 'HYBRID'];
import { Units } from '@/src/domain/units';
import { validateWorkoutDraft } from '@/src/domain/validation';
import { plannedDurationForDraft } from '@/src/engine/workout/plannedDuration';
import { useVolt } from '@/src/features/app/VoltProvider';
import { Body, Button, Card, Heading, Label, Strong } from '@/src/ui/components/primitives';
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

  function addExercise(exerciseId: WorkoutExercise['exerciseId']) {
    const exercise = db.exercises.get(exerciseId);
    if (!exercise) return;
    setItems((current) => [
      ...current,
      {
        id: createId(),
        workoutId: (existing?.workout.id ?? createId()) as WorkoutExercise['workoutId'],
        exerciseId,
        orderIndex: current.length,
        trackingMode: exercise.trackingMode,
        plannedWorkSeconds: exercise.defaultWorkDurationSeconds || settings.defaultWorkSeconds,
        plannedRestSeconds: exercise.defaultRestDurationSeconds || settings.defaultRestSeconds,
        plannedReps: exercise.trackingMode === 'REPS' || exercise.trackingMode === 'HYBRID' ? 12 : undefined,
      },
    ]);
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
          <Label>Rounds</Label>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <Button label="−" variant="ghost" onPress={() => setRounds((value) => Math.max(1, value - 1))} />
            <Strong>{rounds}</Strong>
            <Button label="+" variant="ghost" onPress={() => setRounds((value) => value + 1)} />
          </View>
          <Body style={{ marginTop: 12, color: theme.color.muted }}>
            Planned duration {Units.formatCompactDuration(duration)}
          </Body>
        </Card>

        {items.map((item, index) => {
          const exercise = db.exercises.get(item.exerciseId);
          return (
            <Card key={item.id}>
              <Strong>
                {index + 1}. {exercise?.name ?? 'Exercise'}
              </Strong>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {TRACKING_MODES.map((mode) => (
                  <Button
                    key={mode}
                    label={mode}
                    variant={item.trackingMode === mode ? 'primary' : 'ghost'}
                    onPress={() =>
                      setItems((current) =>
                        current.map((row) => (row.id === item.id ? { ...row, trackingMode: mode } : row)),
                      )
                    }
                  />
                ))}
              </View>
              <StepperRow
                label="Work (s)"
                value={item.plannedWorkSeconds}
                onChange={(value) =>
                  setItems((current) =>
                    current.map((row) => (row.id === item.id ? { ...row, plannedWorkSeconds: value } : row)),
                  )
                }
              />
              <StepperRow
                label="Rest (s)"
                value={item.plannedRestSeconds}
                onChange={(value) =>
                  setItems((current) =>
                    current.map((row) => (row.id === item.id ? { ...row, plannedRestSeconds: value } : row)),
                  )
                }
              />
              {item.trackingMode === 'REPS' || item.trackingMode === 'HYBRID' ? (
                <StepperRow
                  label="Target reps"
                  value={item.plannedReps ?? 0}
                  onChange={(value) =>
                    setItems((current) =>
                      current.map((row) => (row.id === item.id ? { ...row, plannedReps: value || undefined } : row)),
                    )
                  }
                />
              ) : null}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Button
                  label="Up"
                  variant="ghost"
                  onPress={() =>
                    setItems((current) => {
                      if (index === 0) return current;
                      const next = [...current];
                      [next[index - 1], next[index]] = [next[index], next[index - 1]];
                      return next;
                    })
                  }
                />
                <Button
                  label="Down"
                  variant="ghost"
                  onPress={() =>
                    setItems((current) => {
                      if (index === current.length - 1) return current;
                      const next = [...current];
                      [next[index + 1], next[index]] = [next[index], next[index + 1]];
                      return next;
                    })
                  }
                />
                <Button
                  label="Remove"
                  variant="danger"
                  onPress={() => setItems((current) => current.filter((row) => row.id !== item.id))}
                />
              </View>
            </Card>
          );
        })}

        <Button label="Add exercise" variant="ghost" onPress={() => setPickerOpen((value) => !value)} />
        {pickerOpen ? (
          <Card>
            {db.exercises.list().map((exercise) => (
              <Pressable
                key={exercise.id}
                onPress={() => addExercise(exercise.id)}
                style={{ minHeight: 48, justifyContent: 'center' }}>
                <Strong>{exercise.name}</Strong>
                <Body style={{ color: theme.color.muted }}>{exercise.category}</Body>
              </Pressable>
            ))}
          </Card>
        ) : null}

        <Button label="Save workout" large onPress={() => void save()} />
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
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

function StepperRow({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
      <Body>{label}</Body>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Button label="−" variant="ghost" onPress={() => onChange(Math.max(0, value - 1))} />
        <Strong>{value}</Strong>
        <Button label="+" variant="ghost" onPress={() => onChange(value + 1)} />
      </View>
    </View>
  );
}
