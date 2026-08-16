import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Exercise } from '../../domain/types';
import { ExerciseDemo } from '../live/ExerciseDemo';
import { Body, Button, Label } from '../../ui/components/primitives';
import { useTheme } from '../../ui/theme/ThemeProvider';
import { addExercisesLabel, toggleSelection } from './exercisePickerLogic';

export function ExercisePicker({
  visible,
  exercises,
  onCancel,
  onAdd,
}: {
  visible: boolean;
  exercises: Exercise[];
  onCancel: () => void;
  onAdd: (ids: Array<Exercise['id']>) => void;
}) {
  const theme = useTheme();
  const [selected, setSelected] = useState<Array<Exercise['id']>>([]);

  useEffect(() => {
    if (visible) setSelected([]);
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.bg }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 8 }}>
          <Label>Add to workout</Label>
          <Text
            style={{
              fontFamily: theme.type.display,
              color: theme.color.text,
              fontSize: 36,
              lineHeight: 38,
            }}>
            Select exercises
          </Text>
          <Body style={{ color: theme.color.muted }}>
            Tap every move you want. They are added in the order you select them.
          </Body>
          <Label style={{ color: theme.color.accent, marginTop: 4 }}>
            {selected.length === 0 ? 'None selected' : `${selected.length} selected`}
          </Label>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 8, paddingBottom: 24 }}>
          {exercises.map((exercise) => {
            const active = selected.includes(exercise.id);
            const order = selected.indexOf(exercise.id);
            return (
              <Pressable
                key={exercise.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                accessibilityLabel={exercise.name}
                onPress={() => setSelected((current) => toggleSelection(current, exercise.id))}
                style={({ pressed }) => ({
                  minHeight: 76,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 10,
                  borderRadius: theme.radius.md,
                  backgroundColor: active ? theme.color.surface : 'transparent',
                  borderWidth: 1,
                  borderColor: active ? theme.color.accent : theme.color.line,
                  opacity: pressed ? 0.85 : 1,
                })}>
                <ExerciseDemo
                  exerciseId={exercise.id}
                  movementType={exercise.movementType}
                  captionPlacement="none"
                  size={56}
                  reducedMotion
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{
                      fontFamily: theme.type.display,
                      color: theme.color.text,
                      fontSize: 22,
                      lineHeight: 24,
                    }}>
                    {exercise.name}
                  </Text>
                  <Body style={{ color: theme.color.muted }}>{exercise.category}</Body>
                </View>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? theme.color.accent : theme.color.surface2,
                    borderWidth: 1,
                    borderColor: active ? theme.color.accent : theme.color.line,
                  }}>
                  {active ? (
                    <Text
                      style={{
                        fontFamily: theme.type.display,
                        color: theme.color.accentInk,
                        fontSize: 14,
                        lineHeight: 16,
                      }}>
                      {order + 1}
                    </Text>
                  ) : (
                    <Ionicons name="add" size={16} color={theme.color.muted} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View
          style={{
            padding: 20,
            paddingTop: 12,
            gap: 10,
            borderTopWidth: 1,
            borderTopColor: theme.color.line,
            backgroundColor: theme.color.bg,
          }}>
          <Button
            label={addExercisesLabel(selected.length)}
            large
            disabled={selected.length === 0}
            onPress={() => onAdd(selected)}
          />
          <Button label="Cancel" variant="ghost" onPress={onCancel} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
