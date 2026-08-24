import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';
import { db } from '@/src/data/database';
import { buildExportRows, toCsv, toJson, buildExportPayload } from '@/src/data/export';
import { useVolt } from '@/src/features/app/VoltProvider';
import { resetOnboarding } from '@/src/features/onboarding/logic';
import { useWebInstall } from '@/src/pwa/install';
import { Body, Button, Card, Heading, Label, SegmentedControl, Strong } from '@/src/ui/components/primitives';
import { syncReminders } from '@/src/ui/notifications';
import { useTheme } from '@/src/ui/theme/ThemeProvider';

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { settings } = useVolt();
  const { canInstall, install } = useWebInstall();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [checkingIntegrity, setCheckingIntegrity] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<{ valid: boolean; issues: string[]; fixed?: string[] } | null>(null);

  async function patch(next: Partial<typeof settings>) {
    await db.settings.update(next);
    if (next.remindersEnabled != null || next.reminderHour != null || next.reminderMinute != null) {
      await syncReminders({ ...settings, ...next });
    }
  }

  async function exportData(format: 'json' | 'csv') {
    const sessions = db.sessions.list();
    const intervals = sessions.flatMap((session) => db.intervals.listBySession(session.id));
    const rows = buildExportRows(sessions, intervals);
    const payload =
      format === 'csv'
        ? toCsv(rows)
        : toJson(buildExportPayload(
            sessions,
            intervals,
            db.performance.list(),
            db.records.list(),
            db.trainingDays.list(),
            db.workouts.list(),
            db.workouts.list().flatMap((w) => db.workouts.plan(w.id)?.exercises.map((e) => ({ ...e, workoutId: w.id })) ?? []),
            db.exercises.list(),
            db.user.get(),
            db.settings.get(),
          ));
    const file = `${FileSystem.cacheDirectory}hiit-tracker-export.${format}`;
    await FileSystem.writeAsStringAsync(file, payload);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file);
    } else {
      Alert.alert('Export ready', `Saved to ${file}`);
    }
  }

  async function checkIntegrity() {
    setCheckingIntegrity(true);
    const result = db.validateIntegrity();
    setIntegrityResult({ ...result, fixed: undefined });
    setCheckingIntegrity(false);
  }

  async function repairIntegrity() {
    setCheckingIntegrity(true);
    const result = await db.repair();
    // Re-validate after repair
    const validation = db.validateIntegrity();
    setIntegrityResult({ ...validation, fixed: result.fixed });
    setCheckingIntegrity(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 48 }}>
        <Heading>Profile</Heading>
        <Body style={{ color: theme.color.muted }}>Local-only athlete profile. No account required.</Body>

        <Card>
          <Label>Appearance</Label>
          <View style={{ marginTop: 12 }}>
            <SegmentedControl
              value={settings.theme}
              onChange={(value) => void patch({ theme: value as typeof settings.theme })}
              options={[
                { label: 'Dark', value: 'dark' },
                { label: 'Light', value: 'light' },
                { label: 'System', value: 'system' },
              ]}
            />
          </View>
          <Toggle
            label="Reduce motion"
            value={settings.reducedMotion}
            onChange={(value) => void patch({ reducedMotion: value })}
          />
        </Card>

        <Card>
          <Label>Training</Label>
          <Stepper
            label="Countdown"
            value={settings.countdownSeconds}
            suffix="s"
            onChange={(value) => void patch({ countdownSeconds: value })}
          />
          <Stepper
            label="Work"
            value={settings.defaultWorkSeconds}
            suffix="s"
            onChange={(value) => void patch({ defaultWorkSeconds: value })}
          />
          <Stepper
            label="Rest"
            value={settings.defaultRestSeconds}
            suffix="s"
            onChange={(value) => void patch({ defaultRestSeconds: value })}
          />
          <Stepper
            label="Rounds"
            value={settings.defaultRounds}
            onChange={(value) => void patch({ defaultRounds: Math.max(1, value) })}
          />
          <View style={{ marginTop: 12 }}>
            <Label>Distance units</Label>
            <View style={{ marginTop: 10 }}>
              <SegmentedControl
                value={settings.distanceUnit}
                onChange={(value) => void patch({ distanceUnit: value as typeof settings.distanceUnit })}
                options={[
                  { label: 'm', value: 'm' },
                  { label: 'km', value: 'km' },
                  { label: 'mi', value: 'mi' },
                ]}
              />
            </View>
          </View>
        </Card>

        <Card>
          <Label>Feedback</Label>
          <Toggle label="Sound" value={settings.soundEnabled} onChange={(value) => void patch({ soundEnabled: value })} />
          <Toggle
            label="Interval countdown"
            value={settings.countdownSound}
            disabled={!settings.soundEnabled}
            onChange={(value) => void patch({ countdownSound: value })}
          />
          <Toggle
            label="Rest ending"
            value={settings.restEndingAlert}
            disabled={!settings.soundEnabled}
            onChange={(value) => void patch({ restEndingAlert: value })}
          />
          <Toggle
            label="Workout complete"
            value={settings.completionSound}
            disabled={!settings.soundEnabled}
            onChange={(value) => void patch({ completionSound: value })}
          />
          <Toggle label="Haptics" value={settings.hapticsEnabled} onChange={(value) => void patch({ hapticsEnabled: value })} />
          <Toggle
            label="Interval changes"
            value={settings.hapticIntervalChanges !== false}
            disabled={!settings.hapticsEnabled}
            onChange={(value) => void patch({ hapticIntervalChanges: value })}
          />
          <Toggle
            label="Countdown"
            value={settings.hapticCountdown !== false}
            disabled={!settings.hapticsEnabled}
            onChange={(value) => void patch({ hapticCountdown: value })}
          />
          <Toggle
            label="Workout complete"
            value={settings.hapticComplete !== false}
            disabled={!settings.hapticsEnabled}
            onChange={(value) => void patch({ hapticComplete: value })}
          />
        </Card>

        <Card>
          <Label>Reminders</Label>
          <Body style={{ marginTop: 8, color: theme.color.muted }}>
            Optional. Off by default. Never framed as guilt.
          </Body>
          <Toggle
            label="Daily reminder"
            value={settings.remindersEnabled}
            onChange={(value) => void patch({ remindersEnabled: value })}
          />
          <Stepper
            label="Hour"
            value={settings.reminderHour}
            onChange={(value) => void patch({ reminderHour: Math.min(23, Math.max(0, value)) })}
          />
          <Stepper
            label="Minute"
            value={settings.reminderMinute}
            onChange={(value) => void patch({ reminderMinute: Math.min(59, Math.max(0, value)) })}
          />
        </Card>

        <Card>
          <Label>Install app</Label>
          <Body style={{ marginTop: 8, color: theme.color.muted }}>
            {canInstall
              ? 'Install HIIT Tracker on this phone. Chrome will use the high-resolution app icon.'
              : 'On Chrome, use Install app in the menu after this page has been open for a moment. If you only see Add to Home screen, this site is still loading as a shortcut.'}
          </Body>
          {canInstall ? (
            <View style={{ marginTop: 12 }}>
              <Button label="Install HIIT Tracker" onPress={() => void install()} />
            </View>
          ) : null}
        </Card>

        <Card>
          <Label>Setup</Label>
          <Body style={{ marginTop: 8, color: theme.color.muted }}>
            Replay the introduction without changing your saved training data.
          </Body>
          <View style={{ marginTop: 12 }}>
            <Button
              label="Replay onboarding"
              variant="ghost"
              onPress={async () => {
                await db.user.update(resetOnboarding(db.user.get()));
                router.replace('/onboarding');
              }}
            />
          </View>
        </Card>

        <Card>
          <Label>Data</Label>
          <View style={{ marginTop: 12, gap: 8 }}>
            <Button label="Export JSON" variant="ghost" onPress={() => void exportData('json')} />
            <Button label="Export CSV" variant="ghost" onPress={() => void exportData('csv')} />
            <Button label="Check data integrity" variant="ghost" onPress={() => void checkIntegrity()} disabled={checkingIntegrity} />
            {integrityResult ? (
              <View style={{ gap: 8, marginTop: 8 }}>
                <Body style={{ color: integrityResult.valid ? theme.color.success : theme.color.warn }}>
                  {integrityResult.valid ? '✓ All data is consistent' : `⚠ ${integrityResult.issues.length} issue(s) found`}
                </Body>
                {!integrityResult.valid && integrityResult.issues.length > 0 && (
                  <View style={{ gap: 4 }}>
                    {integrityResult.issues.slice(0, 5).map((issue, i) => (
                      <Body key={i} style={{ color: theme.color.muted, fontSize: 13 }}>
                        {issue}
                      </Body>
                    ))}
                    {integrityResult.issues.length > 5 && (
                      <Body style={{ color: theme.color.muted, fontSize: 13 }}>
                        +{integrityResult.issues.length - 5} more...
                      </Body>
                    )}
                  </View>
                )}
                {!integrityResult.valid && integrityResult.fixed?.length ? (
                  <Body style={{ color: theme.color.success, fontSize: 13 }}>
                    Fixed: {integrityResult.fixed.join(', ')}
                  </Body>
                ) : !integrityResult.valid ? (
                  <Button label="Repair data" variant="primary" onPress={() => void repairIntegrity()} disabled={checkingIntegrity} />
                ) : null}
              </View>
            ) : null}
            <Button
              label={confirmDelete ? 'Tap again to delete all workout data' : 'Delete all workout data'}
              variant="danger"
              onPress={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  return;
                }
                void db.deleteWorkoutData();
                setConfirmDelete(false);
              }}
            />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Toggle({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: 48,
        opacity: disabled ? 0.38 : 1,
      }}>
      <Strong>{label}</Strong>
      <Switch
        value={disabled ? false : value}
        onValueChange={onChange}
        disabled={disabled}
        accessibilityState={{ disabled: Boolean(disabled), checked: disabled ? false : value }}
        trackColor={{ true: theme.color.accent, false: theme.color.line }}
        thumbColor={theme.color.text}
      />
    </View>
  );
}

function Stepper({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 }}>
      <Strong>{label}</Strong>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          onPress={() => onChange(Math.max(0, value - 1))}
          style={{
            minWidth: 44,
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.color.surface2,
            borderRadius: 12,
          }}>
          <Strong>−</Strong>
        </Pressable>
        <Body>
          {value}
          {suffix ? ` ${suffix}` : ''}
        </Body>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          onPress={() => onChange(value + 1)}
          style={{
            minWidth: 44,
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.color.surface2,
            borderRadius: 12,
          }}>
          <Strong>+</Strong>
        </Pressable>
      </View>
    </View>
  );
}
