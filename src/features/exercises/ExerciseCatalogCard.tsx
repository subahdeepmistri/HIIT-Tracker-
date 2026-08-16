import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, useWindowDimensions, View } from 'react-native';

import type { Exercise } from '../../domain/types';
import { ExerciseDemo } from '../live/ExerciseDemo';
import { Body, Card, Label } from '../../ui/components/primitives';
import { useTheme } from '../../ui/theme/ThemeProvider';

export function ExerciseCatalogCard({ exercise }: { exercise: Exercise }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 768;
  const category = exercise.isCustom ? `${exercise.category} · Custom` : exercise.category;

  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'stretch' }}>
        <View style={{ flexShrink: 0 }}>
          <ExerciseDemo
            exerciseId={exercise.id}
            movementType={exercise.movementType}
            caption="Form"
            captionPlacement="overlay"
            width={wide ? 156 : 118}
            height={wide ? 208 : 156}
            reducedMotion
          />
        </View>

        <View style={{ flex: 1, minWidth: 0, justifyContent: 'space-between', gap: 12 }}>
          <View style={{ gap: 12 }}>
            <View>
              <Label>{category}</Label>
              <Text
                style={{
                  marginTop: 4,
                  fontFamily: theme.type.display,
                  color: theme.color.text,
                  fontSize: wide ? 32 : 26,
                  lineHeight: wide ? 34 : 28,
                  letterSpacing: -0.4,
                }}>
                {exercise.name}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <MetaPill label={exercise.trackingMode} />
              <IntervalChip label="Work" value={`${exercise.defaultWorkDurationSeconds}s`} />
              <IntervalChip label="Rest" value={`${exercise.defaultRestDurationSeconds}s`} tone="rest" />
            </View>
          </View>

          {wide ? <HowToMove text={exercise.instructions} /> : null}
        </View>
      </View>

      {wide ? null : (
        <View style={{ marginTop: 16 }}>
          <HowToMove text={exercise.instructions} />
        </View>
      )}

      {exercise.safetyNotes ? (
        <View
          accessible
          accessibilityLabel={`Safety. ${exercise.safetyNotes}`}
          style={{
            marginTop: 14,
            flexDirection: 'row',
            gap: 10,
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderRadius: theme.radius.md,
            backgroundColor: theme.color.surface2,
            borderWidth: 1,
            borderColor: theme.color.line,
            borderLeftWidth: 3,
            borderLeftColor: theme.color.warn,
          }}>
          <Ionicons
            name="shield-checkmark-outline"
            size={18}
            color={theme.color.warn}
            style={{ marginTop: 1 }}
          />
          <View style={{ flex: 1, gap: 4 }}>
            <Label style={{ color: theme.color.warn }}>Safety</Label>
            <Body style={{ color: theme.color.muted, fontSize: 15, lineHeight: 22 }}>
              {exercise.safetyNotes}
            </Body>
          </View>
        </View>
      ) : null}
    </Card>
  );
}

function HowToMove({ text }: { text: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Label>How to move</Label>
      <Body>{text}</Body>
    </View>
  );
}

function MetaPill({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        minHeight: 52,
        justifyContent: 'center',
        paddingHorizontal: 12,
        borderRadius: theme.radius.md,
        backgroundColor: theme.color.surface2,
        borderWidth: 1,
        borderColor: theme.color.line,
      }}>
      <Label style={{ color: theme.color.text }}>{label}</Label>
    </View>
  );
}

function IntervalChip({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'rest';
}) {
  const theme = useTheme();
  const accent = tone === 'rest' ? theme.color.rest : theme.color.text;

  return (
    <View
      style={{
        minWidth: 88,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: theme.radius.md,
        backgroundColor: theme.color.surface2,
        borderWidth: 1,
        borderColor: theme.color.line,
      }}>
      <Label>{label}</Label>
      <Text
        style={{
          marginTop: 2,
          fontFamily: theme.type.display,
          color: accent,
          fontSize: 24,
          lineHeight: 26,
        }}>
        {value}
      </Text>
    </View>
  );
}
