import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Exercise, TrackingMode, WorkoutExercise } from '../../domain/types';
import { ExerciseDemo } from '../live/ExerciseDemo';
import { Card, Label } from '../../ui/components/primitives';
import { useTheme } from '../../ui/theme/ThemeProvider';

const TRACKING_MODES: TrackingMode[] = ['TIME', 'REPS', 'DISTANCE', 'HYBRID'];

export function BuilderExerciseCard({
  index,
  item,
  exercise,
  onChange,
  onMove,
  onRemove,
}: {
  index: number;
  item: WorkoutExercise;
  exercise?: Exercise;
  onChange: (patch: Partial<WorkoutExercise>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const showReps = item.trackingMode === 'REPS' || item.trackingMode === 'HYBRID';
  const showDistance = item.trackingMode === 'DISTANCE' || item.trackingMode === 'HYBRID';

  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <ExerciseDemo
          exerciseId={item.exerciseId}
          movementType={exercise?.movementType}
          captionPlacement="none"
          width={72}
          height={92}
          reducedMotion
        />
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <Text
              style={{
                fontFamily: theme.type.display,
                color: theme.color.accent,
                fontSize: 20,
                lineHeight: 22,
              }}>
              {String(index + 1).padStart(2, '0')}
            </Text>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: theme.type.display,
                  color: theme.color.text,
                  fontSize: 24,
                  lineHeight: 26,
                  letterSpacing: -0.3,
                }}>
                {exercise?.name ?? 'Exercise'}
              </Text>
              {exercise ? <Label style={{ marginTop: 4 }}>{exercise.category}</Label> : null}
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          <IconHit name="chevron-up" label="Move up" onPress={() => onMove(-1)} />
          <IconHit name="chevron-down" label="Move down" onPress={() => onMove(1)} />
          <IconHit name="trash-outline" label="Remove exercise" onPress={onRemove} danger />
        </View>
      </View>

      <View style={{ marginTop: 16, gap: 8 }}>
        <Label>Track</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {TRACKING_MODES.map((mode) => {
            const active = item.trackingMode === mode;
            return (
              <Pressable
                key={mode}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={mode}
                onPress={() => onChange({ trackingMode: mode })}
                style={({ pressed }) => ({
                  minHeight: 40,
                  paddingHorizontal: 12,
                  borderRadius: theme.radius.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: active ? theme.color.accent : theme.color.surface2,
                  borderWidth: 1,
                  borderColor: active ? theme.color.accent : theme.color.line,
                  opacity: pressed ? 0.82 : 1,
                })}>
                <Label style={{ color: active ? theme.color.accentInk : theme.color.text }}>{mode}</Label>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
        <StepperChip
          label="Work"
          value={`${item.plannedWorkSeconds}s`}
          onMinus={() => onChange({ plannedWorkSeconds: Math.max(0, item.plannedWorkSeconds - 5) })}
          onPlus={() => onChange({ plannedWorkSeconds: item.plannedWorkSeconds + 5 })}
        />
        <StepperChip
          label="Rest"
          value={`${item.plannedRestSeconds}s`}
          tone="rest"
          onMinus={() => onChange({ plannedRestSeconds: Math.max(0, item.plannedRestSeconds - 5) })}
          onPlus={() => onChange({ plannedRestSeconds: item.plannedRestSeconds + 5 })}
        />
        {showReps ? (
          <StepperChip
            label="Target reps"
            value={String(item.plannedReps ?? 0)}
            onMinus={() => onChange({ plannedReps: Math.max(0, (item.plannedReps ?? 0) - 1) || undefined })}
            onPlus={() => onChange({ plannedReps: (item.plannedReps ?? 0) + 1 })}
          />
        ) : null}
        {showDistance ? (
          <StepperChip
            label="Distance"
            value={`${item.plannedDistance ?? 0}${item.distanceUnit ?? 'm'}`}
            onMinus={() => onChange({ plannedDistance: Math.max(0, (item.plannedDistance ?? 0) - 50) || undefined })}
            onPlus={() => onChange({ plannedDistance: (item.plannedDistance ?? 0) + 50 })}
          />
        ) : null}
      </View>
    </Card>
  );
}

function StepperChip({
  label,
  value,
  tone = 'default',
  onMinus,
  onPlus,
}: {
  label: string;
  value: string;
  tone?: 'default' | 'rest';
  onMinus: () => void;
  onPlus: () => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexGrow: 1,
        minWidth: 148,
        padding: 12,
        borderRadius: theme.radius.md,
        backgroundColor: theme.color.surface2,
        borderWidth: 1,
        borderColor: theme.color.line,
      }}>
      <Label>{label}</Label>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <StepHit label={`Decrease ${label}`} symbol="−" onPress={onMinus} />
        <Text
          style={{
            fontFamily: theme.type.display,
            color: tone === 'rest' ? theme.color.rest : theme.color.text,
            fontSize: 28,
            lineHeight: 30,
          }}>
          {value}
        </Text>
        <StepHit label={`Increase ${label}`} symbol="+" onPress={onPlus} />
      </View>
    </View>
  );
}

function StepHit({ label, symbol, onPress }: { label: string; symbol: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.color.surface,
        borderWidth: 1,
        borderColor: theme.color.line,
        opacity: pressed ? 0.75 : 1,
      })}>
      <Text style={{ fontFamily: theme.type.uiStrong, color: theme.color.text, fontSize: 20 }}>{symbol}</Text>
    </Pressable>
  );
}

function IconHit({
  name,
  label,
  onPress,
  danger,
}: {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}>
      <Ionicons name={name} size={20} color={danger ? theme.color.danger : theme.color.text} />
    </Pressable>
  );
}
