import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ExerciseCategory } from '@/src/domain/types';
import { useVolt } from '@/src/features/app/VoltProvider';
import { Body, Button, Card, Heading, Label, Strong } from '@/src/ui/components/primitives';
import { useTheme } from '@/src/ui/theme/ThemeProvider';

const CATEGORIES: Array<ExerciseCategory | 'All'> = [
  'All',
  'Cardio',
  'Bodyweight',
  'Core',
  'Lower Body',
  'Upper Body',
  'Full Body',
  'Plyometric',
  'Conditioning',
];

export default function ExerciseLibraryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { db } = useVolt();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ExerciseCategory | 'All'>('All');
  const rows = db.exercises.search(query, category === 'All' ? undefined : category);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}>
        <Heading>Exercises</Heading>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search"
          placeholderTextColor={theme.color.muted}
          accessibilityLabel="Search exercises"
          style={{
            minHeight: 48,
            borderRadius: 16,
            paddingHorizontal: 16,
            backgroundColor: theme.color.surface,
            color: theme.color.text,
            borderWidth: 1,
            borderColor: theme.color.line,
            fontFamily: theme.type.ui,
          }}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {CATEGORIES.map((item) => (
              <Button
                key={item}
                label={item}
                variant={category === item ? 'primary' : 'ghost'}
                onPress={() => setCategory(item)}
              />
            ))}
          </View>
        </ScrollView>
        <Button label="Create custom" variant="ghost" onPress={() => router.push('/exercises/create')} />
        {rows.map((exercise) => (
          <Card key={exercise.id}>
            <Label>
              {exercise.category} · {exercise.trackingMode}
              {exercise.isCustom ? ' · Custom' : ''}
            </Label>
            <Strong style={{ marginTop: 4 }}>{exercise.name}</Strong>
            <Body style={{ marginTop: 6 }}>{exercise.instructions}</Body>
            <Body style={{ marginTop: 6, color: theme.color.muted }}>{exercise.safetyNotes}</Body>
            <Body style={{ marginTop: 6, color: theme.color.muted }}>
              Default {exercise.defaultWorkDurationSeconds}s / {exercise.defaultRestDurationSeconds}s · difficulty{' '}
              {exercise.difficulty}/5
            </Body>
          </Card>
        ))}
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}
