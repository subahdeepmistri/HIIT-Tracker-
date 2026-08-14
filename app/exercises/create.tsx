import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createId } from '@/src/domain/ids';
import type { ExerciseCategory, TrackingMode } from '@/src/domain/types';
import { useVolt } from '@/src/features/app/VoltProvider';
import { Button, Heading, Label, Strong } from '@/src/ui/components/primitives';
import { useTheme } from '@/src/ui/theme/ThemeProvider';

const CATEGORIES: ExerciseCategory[] = [
  'Cardio',
  'Bodyweight',
  'Core',
  'Lower Body',
  'Upper Body',
  'Full Body',
  'Plyometric',
  'Conditioning',
];
const TRACKING_MODES: TrackingMode[] = ['TIME', 'REPS', 'DISTANCE', 'HYBRID'];

export default function CreateExerciseScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { db, settings } = useVolt();
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [safetyNotes, setSafetyNotes] = useState('');
  const [category, setCategory] = useState<ExerciseCategory>('Conditioning');
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('TIME');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        <Heading>Custom exercise</Heading>
        <Field label="Name" value={name} onChange={setName} />
        <Field label="Instructions" value={instructions} onChange={setInstructions} />
        <Field label="Safety notes" value={safetyNotes} onChange={setSafetyNotes} />
        <Strong>Category</Strong>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORIES.map((item) => (
            <Button
              key={item}
              label={item}
              variant={category === item ? 'primary' : 'ghost'}
              onPress={() => setCategory(item)}
            />
          ))}
        </View>
        <Strong>Tracking</Strong>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TRACKING_MODES.map((item) => (
            <Button
              key={item}
              label={item}
              variant={trackingMode === item ? 'primary' : 'ghost'}
              onPress={() => setTrackingMode(item)}
            />
          ))}
        </View>
        <Button
          label="Save"
          large
          onPress={async () => {
            if (!name.trim()) {
              Alert.alert('Name required');
              return;
            }
            const now = Date.now();
            await db.exercises.upsert({
              id: createId(),
              name: name.trim(),
              category,
              movementType: 'dynamic',
              equipment: ['none'],
              defaultWorkDurationSeconds: settings.defaultWorkSeconds,
              defaultRestDurationSeconds: settings.defaultRestSeconds,
              trackingMode,
              instructions: instructions.trim() || 'No instructions provided.',
              safetyNotes: safetyNotes.trim() || 'Move within a comfortable range.',
              difficulty: 3,
              isCustom: true,
              createdAt: now,
              updatedAt: now,
            });
            router.back();
          }}
        />
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const theme = useTheme();
  return (
    <View>
      <Label>{label}</Label>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholderTextColor={theme.color.muted}
        style={{
          marginTop: 8,
          minHeight: 48,
          borderRadius: 16,
          paddingHorizontal: 16,
          backgroundColor: theme.color.surface,
          color: theme.color.text,
          borderWidth: 1,
          borderColor: theme.color.line,
        }}
      />
    </View>
  );
}
