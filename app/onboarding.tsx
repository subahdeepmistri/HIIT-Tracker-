import { Redirect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useVolt } from '@/src/features/app/VoltProvider';
import { Body, Button, Card, Heading, Label, SegmentedControl, Strong } from '@/src/ui/components/primitives';
import { useTheme } from '@/src/ui/theme/ThemeProvider';

const STEPS = 7;

export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { db, settings } = useVolt();
  const [step, setStep] = useState(0);

  if (db.user.get().onboardingCompletedAt) {
    return <Redirect href="/" />;
  }

  async function finish() {
    await db.user.update({ onboardingCompletedAt: Date.now() });
    router.replace('/');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.bg }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 40 }}>
        <Label>
          {step + 1} / {STEPS}
        </Label>
        {step === 0 ? (
          <>
            <Heading>HIIT Tracker</Heading>
            <Body>Train the interval. Measure the truth.</Body>
            <Body>A HIIT tracker that never overwrites your plan with what you actually did.</Body>
          </>
        ) : null}
        {step === 1 ? (
          <>
            <Heading>Planned vs actual</Heading>
            <Body>Every workout stores two stories: what you intended, and what you completed.</Body>
            <Card>
              <Strong>If you only log time and reps, we only calculate time and reps.</Strong>
              <Body style={{ marginTop: 8 }}>Missing data shows as “Not enough data.” Never a fake number.</Body>
            </Card>
          </>
        ) : null}
        {step === 2 ? (
          <>
            <Heading>Units</Heading>
            <Body>Used for distance-based work. You can change this later.</Body>
            <SegmentedControl
              value={settings.distanceUnit}
              onChange={(value) => void db.settings.update({ distanceUnit: value as typeof settings.distanceUnit })}
              options={[
                { label: 'Meters', value: 'm' },
                { label: 'Kilometers', value: 'km' },
                { label: 'Miles', value: 'mi' },
              ]}
            />
          </>
        ) : null}
        {step === 3 ? (
          <>
            <Heading>Default HIIT</Heading>
            <Body>These fill new workouts. Change any session later.</Body>
            <Card>
              <Strong>Work {settings.defaultWorkSeconds}s</Strong>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Button
                  label="−"
                  variant="ghost"
                  onPress={() => void db.settings.update({ defaultWorkSeconds: Math.max(5, settings.defaultWorkSeconds - 5) })}
                />
                <Button
                  label="+"
                  variant="ghost"
                  onPress={() => void db.settings.update({ defaultWorkSeconds: settings.defaultWorkSeconds + 5 })}
                />
              </View>
              <Strong style={{ marginTop: 16 }}>Rest {settings.defaultRestSeconds}s</Strong>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Button
                  label="−"
                  variant="ghost"
                  onPress={() => void db.settings.update({ defaultRestSeconds: Math.max(0, settings.defaultRestSeconds - 5) })}
                />
                <Button
                  label="+"
                  variant="ghost"
                  onPress={() => void db.settings.update({ defaultRestSeconds: settings.defaultRestSeconds + 5 })}
                />
              </View>
              <Strong style={{ marginTop: 16 }}>Rounds {settings.defaultRounds}</Strong>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Button
                  label="−"
                  variant="ghost"
                  onPress={() => void db.settings.update({ defaultRounds: Math.max(1, settings.defaultRounds - 1) })}
                />
                <Button
                  label="+"
                  variant="ghost"
                  onPress={() => void db.settings.update({ defaultRounds: settings.defaultRounds + 1 })}
                />
              </View>
              <Strong style={{ marginTop: 16 }}>Countdown {settings.countdownSeconds}s</Strong>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Button
                  label="−"
                  variant="ghost"
                  onPress={() => void db.settings.update({ countdownSeconds: Math.max(0, settings.countdownSeconds - 1) })}
                />
                <Button
                  label="+"
                  variant="ghost"
                  onPress={() => void db.settings.update({ countdownSeconds: settings.countdownSeconds + 1 })}
                />
              </View>
            </Card>
          </>
        ) : null}
        {step === 4 ? (
          <>
            <Heading>Cues</Heading>
            <Body>Sound and haptics help when you cannot look at the screen. Each can be turned off.</Body>
            <Button
              label={settings.soundEnabled ? 'Sound on' : 'Sound off'}
              variant={settings.soundEnabled ? 'primary' : 'ghost'}
              onPress={() => void db.settings.update({ soundEnabled: !settings.soundEnabled })}
            />
            <Button
              label={settings.hapticsEnabled ? 'Haptics on' : 'Haptics off'}
              variant={settings.hapticsEnabled ? 'primary' : 'ghost'}
              onPress={() => void db.settings.update({ hapticsEnabled: !settings.hapticsEnabled })}
            />
          </>
        ) : null}
        {step === 5 ? (
          <>
            <Heading>First workout</Heading>
            <Body>Use a starter session or build your own. Starter workouts are editable templates — not fake history.</Body>
            <Button label="Use Morning HIIT" onPress={() => setStep(6)} />
            <Button
              label="Create my own"
              variant="ghost"
              onPress={async () => {
                await db.user.update({ onboardingCompletedAt: Date.now() });
                router.replace('/workouts/builder');
              }}
            />
          </>
        ) : null}
        {step === 6 ? (
          <>
            <Heading>Start training</Heading>
            <Body>Open Morning HIIT, review the plan, then start. The live screen is built for tired hands.</Body>
          </>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          {step > 0 ? <Button label="Back" variant="ghost" onPress={() => setStep((value) => value - 1)} /> : null}
          {step < STEPS - 1 ? (
            <Button label="Continue" onPress={() => setStep((value) => value + 1)} />
          ) : (
            <Button label="Start training" large onPress={() => void finish()} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
