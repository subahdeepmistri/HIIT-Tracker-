import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { localDateKey } from '@/src/domain/date';
import { useVolt } from '@/src/features/app/VoltProvider';
import { Body, Button, Card, Heading, Label, Strong } from '@/src/ui/components/primitives';
import { useTheme } from '@/src/ui/theme/ThemeProvider';

export default function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { db } = useVolt();
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(localDateKey(today.getTime()));
  const days = useMemo(() => monthCells(cursor), [cursor]);
  const dayMap = new Map(db.trainingDays.list().map((row) => [row.date, row]));
  const selectedDay = dayMap.get(selected);
  const sessions = (selectedDay?.sessionIds ?? [])
    .map((id) => db.sessions.get(id))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Heading>Calendar</Heading>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            label="Prev"
            variant="ghost"
            onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          />
          <Strong>
            {cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
          </Strong>
          <Button
            label="Next"
            variant="ghost"
            onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => (
            <Label key={d} style={{ width: `${100 / 7}%`, textAlign: 'center', marginBottom: 8 }}>
              {d}
            </Label>
          ))}
          {days.map((cell, index) => {
            if (!cell) return <View key={`empty-${index}`} style={{ width: `${100 / 7}%`, height: 48 }} />;
            const key = localDateKey(cell.getTime());
            const status = dayMap.get(key)?.status;
            const color =
              status === 'COMPLETED'
                ? theme.color.accent
                : status === 'PARTIAL'
                  ? theme.color.warn
                  : status === 'REST'
                    ? theme.color.rest
                    : status === 'MISSED'
                      ? theme.color.danger
                      : 'transparent';
            return (
              <Pressable
                key={key}
                onPress={() => setSelected(key)}
                accessibilityLabel={`${key} ${status ?? 'no session'}`}
                style={{
                  width: `${100 / 7}%`,
                  height: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  backgroundColor: selected === key ? theme.color.surface : 'transparent',
                }}>
                <Strong>{cell.getDate()}</Strong>
                <View style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: color, marginTop: 2 }} />
              </Pressable>
            );
          })}
        </View>
        <Card>
          <Label>{selected}</Label>
          {sessions.length === 0 ? (
            <Body style={{ marginTop: 8 }}>No recorded workout this day.</Body>
          ) : (
            sessions.map((session) => (
              <Pressable key={session.id} onPress={() => router.push(`/history/${session.id}`)} style={{ marginTop: 10 }}>
                <Strong>{session.workoutNameSnapshot}</Strong>
                <Body style={{ color: theme.color.muted }}>{session.status}</Body>
              </Pressable>
            ))
          )}
          <View style={{ marginTop: 12 }}>
            <Button label="Mark rest day" variant="ghost" onPress={() => void db.trainingDays.markRest(selected)} />
          </View>
        </Card>
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

function monthCells(month: Date): Array<Date | null> {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const cells: Array<Date | null> = Array.from({ length: first.getDay() }, () => null);
  for (let day = 1; day <= last.getDate(); day += 1) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  }
  return cells;
}
