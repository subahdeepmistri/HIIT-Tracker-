import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ExerciseCategory } from '@/src/domain/types';
import { useVolt } from '@/src/features/app/VoltProvider';
import { ExerciseCatalogCard } from '@/src/features/exercises/ExerciseCatalogCard';
import { Body, Button, Heading } from '@/src/ui/components/primitives';
import { goBackOr } from '@/src/ui/navigation';
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
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40, width: '100%' }}>
        <View style={{ gap: 8, width: '100%' }}>
          <Heading>Exercises</Heading>
          <Body style={{ color: theme.color.muted, maxWidth: '100%' }}>
            Form, timing, and safety for every movement.
          </Body>
        </View>
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
            fontSize: 16,
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
          <ExerciseCatalogCard key={exercise.id} exercise={exercise} />
        ))}
        <Button label="Workouts" variant="ghost" onPress={() => goBackOr(router, '/workouts')} />
      </ScrollView>
    </SafeAreaView>
  );
}
