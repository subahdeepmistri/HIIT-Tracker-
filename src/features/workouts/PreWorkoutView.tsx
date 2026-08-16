import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { WorkoutExercise } from '../../domain/types';
import type { Exercise } from '../../domain/types';
import { Units } from '../../domain/units';
import { ExerciseDemo } from '../live/ExerciseDemo';
import { Body, Button, Card, Heading, Label } from '../../ui/components/primitives';
import { useTheme } from '../../ui/theme/ThemeProvider';

type PlannedItem = WorkoutExercise & { exercise: Exercise };

export function PreWorkoutView({
  name,
  notes,
  exerciseCount,
  rounds,
  durationSeconds,
  workSeconds,
  restSeconds,
  countdownSeconds,
  items,
  onStart,
  onEdit,
  onBack,
}: {
  name: string;
  notes: string;
  exerciseCount: number;
  rounds: number;
  durationSeconds: number;
  workSeconds: number;
  restSeconds: number;
  countdownSeconds: number;
  items: PlannedItem[];
  onStart: () => Promise<void>;
  onEdit: () => void;
  onBack: () => void;
}) {
  const theme = useTheme();
  const [starting, setStarting] = useState(false);

  return (
    <View style={{ gap: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextLink label="Workouts" onPress={onBack} />
        <TextLink label="Edit" onPress={onEdit} />
      </View>

      <View style={{ gap: 8 }}>
        <Label>Pre-workout</Label>
        <Heading>{name}</Heading>
        {notes ? <Body style={{ color: theme.color.muted, width: '100%' }}>{notes}</Body> : null}
      </View>

      <Card>
        <Label>Training time</Label>
        <Text
          style={{
            marginTop: 6,
            fontFamily: theme.type.display,
            color: theme.color.accent,
            fontSize: 56,
            lineHeight: 56,
            letterSpacing: -1,
          }}>
          {Units.formatCompactDuration(durationSeconds)}
        </Text>
        <Body style={{ color: theme.color.muted, marginTop: 8, fontSize: 15, lineHeight: 22 }}>
          Work and rest between intervals. The {countdownSeconds}s countdown is preparation and is not included.
        </Body>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          <StatChip label="Rounds" value={String(rounds)} />
          <StatChip label="Moves" value={String(exerciseCount)} />
          <StatChip label="Work" value={Units.formatCompactDuration(workSeconds)} />
          <StatChip label="Rest" value={Units.formatCompactDuration(restSeconds)} tone="rest" />
        </View>
      </Card>

      <View style={{ gap: 10 }}>
        <Label>The session</Label>
        {items.map((item, index) => (
          <ExerciseBeat key={item.id} index={index} item={item} />
        ))}
      </View>

      <View style={{ gap: 10, paddingTop: 4 }}>
        <Button
          label={starting ? 'Starting…' : 'Start workout'}
          large
          loading={starting}
          disabled={starting}
          accessibilityHint={`Start ${name}`}
          onPress={async () => {
            if (starting) return;
            setStarting(true);
            try {
              await onStart();
            } catch {
              setStarting(false);
            }
          }}
        />
        <Body style={{ color: theme.color.muted, textAlign: 'center', fontSize: 14 }}>
          You can discard a session if you start by mistake.
        </Body>
      </View>
    </View>
  );
}

function ExerciseBeat({ index, item }: { index: number; item: PlannedItem }) {
  const theme = useTheme();
  const extras =
    item.plannedReps != null && (item.trackingMode === 'REPS' || item.trackingMode === 'HYBRID')
      ? `${item.plannedReps} reps`
      : null;

  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <ExerciseDemo
          exerciseId={item.exerciseId}
          movementType={item.exercise.movementType}
          captionPlacement="none"
          width={72}
          height={92}
          reducedMotion
        />
        <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text
              style={{
                fontFamily: theme.type.display,
                color: theme.color.accent,
                fontSize: 20,
                lineHeight: 22,
              }}>
              {String(index + 1).padStart(2, '0')}
            </Text>
            <Text
              style={{
                flex: 1,
                fontFamily: theme.type.display,
                color: theme.color.text,
                fontSize: 24,
                lineHeight: 26,
                letterSpacing: -0.3,
              }}>
              {item.exercise.name}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, width: '100%' }}>
            <TinyPill>{item.trackingMode}</TinyPill>
            <TinyPill>{`${item.plannedWorkSeconds}s work`}</TinyPill>
            <TinyPill tone="rest">{`${item.plannedRestSeconds}s rest`}</TinyPill>
            {extras ? <TinyPill>{extras}</TinyPill> : null}
          </View>
        </View>
      </View>
    </Card>
  );
}

function StatChip({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'rest';
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexGrow: 1,
        minWidth: 140,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: theme.radius.md,
        backgroundColor: theme.color.surface2,
        borderWidth: 1,
        borderColor: theme.color.line,
      }}>
      <Label>{label}</Label>
      <Text
        style={{
          marginTop: 4,
          fontFamily: theme.type.display,
          color: tone === 'rest' ? theme.color.rest : theme.color.text,
          fontSize: 28,
          lineHeight: 30,
        }}>
        {value}
      </Text>
    </View>
  );
}

function TinyPill({ children, tone = 'default' }: { children: string; tone?: 'default' | 'rest' }) {
  const theme = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.color.surface2,
        borderWidth: 1,
        borderColor: theme.color.line,
      }}>
      <Label style={{ color: tone === 'rest' ? theme.color.rest : theme.color.text, letterSpacing: 0.8 }}>
        {children}
      </Label>
    </View>
  );
}

function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}>
      <Text style={{ fontFamily: theme.type.uiStrong, color: theme.color.text, fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
}
