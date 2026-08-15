import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, type EntryOrExitLayoutType } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

type Entering = EntryOrExitLayoutType;

import { useVolt } from '@/src/features/app/VoltProvider';
import {
  MORNING_HIIT_ID,
  ONBOARDING_STEP_COUNT,
  REST_PRESETS,
  ROUND_PRESETS,
  WORK_PRESETS,
  applySkipDefaults,
  clampOnboardingStep,
  estimateDefaultSessionDuration,
  isOnboardingComplete,
  markOnboardingComplete,
  morningHiitPreview,
} from '@/src/features/onboarding/logic';
import { PresetRow } from '@/src/features/onboarding/PresetRow';
import { ProgressDots } from '@/src/features/onboarding/ProgressDots';
import { SettingToggle } from '@/src/features/onboarding/SettingToggle';
import { Units } from '@/src/domain/units';
import { Body, Button, Card, Heading, Label, Strong } from '@/src/ui/components/primitives';
import { useTheme } from '@/src/ui/theme/ThemeProvider';

export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { db, settings } = useVolt();
  const user = db.user.get();
  const completed = isOnboardingComplete(user);
  const [step, setStep] = useState(() => clampOnboardingStep(user.onboardingStep));

  useEffect(() => {
    if (completed) return;
    void db.user.update({ onboardingStep: step });
  }, [completed, db, step]);

  const reduced = settings.reducedMotion;
  const enter = reduced ? undefined : FadeInDown.duration(theme.motion.base);
  const fade = reduced ? undefined : FadeIn.duration(theme.motion.fast);

  const estimatedDuration = useMemo(
    () =>
      estimateDefaultSessionDuration({
        workSeconds: settings.defaultWorkSeconds,
        restSeconds: settings.defaultRestSeconds,
        rounds: settings.defaultRounds,
        countdownSeconds: settings.countdownSeconds,
      }),
    [settings.defaultWorkSeconds, settings.defaultRestSeconds, settings.defaultRounds, settings.countdownSeconds],
  );

  const morningPlan = db.workouts.plan(MORNING_HIIT_ID as never);
  const morning = morningPlan ? morningHiitPreview(morningPlan, settings.countdownSeconds) : null;

  if (completed) {
    return <Redirect href="/" />;
  }

  async function completeAndGo(path: '/' | `/workouts/${string}`) {
    await db.user.update(markOnboardingComplete(db.user.get()));
    router.replace(path);
  }

  async function skipSetup() {
    await db.settings.update(applySkipDefaults(settings));
    await completeAndGo('/');
  }

  async function finishRemaining() {
    await completeAndGo('/');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.bg }} edges={['top', 'bottom']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <ProgressDots total={ONBOARDING_STEP_COUNT} index={step} />
        </View>
        {step < ONBOARDING_STEP_COUNT - 1 ? (
          <Button
            label={step === 0 ? 'Skip setup' : 'Skip'}
            variant="ghost"
            onPress={() => void (step === 0 ? skipSetup() : finishRemaining())}
          />
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 16,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled">
        <Animated.View key={step} entering={fade} style={{ flex: 1, gap: 16 }}>
          {step === 0 ? <Welcome enter={enter} /> : null}
          {step === 1 ? <HowItWorks enter={enter} /> : null}
          {step === 2 ? <TrainingPreferences enter={enter} /> : null}
          {step === 3 ? <DefaultPreview enter={enter} durationSeconds={estimatedDuration} /> : null}
          {step === 4 ? <Cues enter={enter} /> : null}
          {step === 5 ? <Ready enter={enter} morning={morning} /> : null}
        </Animated.View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 12, paddingTop: 8, gap: 10 }}>
        {step === 0 ? (
          <Button label="Get started" large onPress={() => setStep(1)} />
        ) : null}
        {step > 0 && step < ONBOARDING_STEP_COUNT - 1 ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="Back" variant="ghost" onPress={() => setStep((value) => value - 1)} />
            <View style={{ flex: 1 }}>
              <Button label="Continue" large onPress={() => setStep((value) => value + 1)} />
            </View>
          </View>
        ) : null}
        {step === ONBOARDING_STEP_COUNT - 1 ? (
          <>
            <Button
              label="Start first workout"
              large
              onPress={() => void completeAndGo(morning ? `/workouts/${MORNING_HIIT_ID}` : '/')}
            />
            <Button label="Go to home" variant="ghost" onPress={() => void completeAndGo('/')} />
            <Button label="Back" variant="ghost" onPress={() => setStep(4)} />
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function Welcome({ enter }: { enter?: Entering }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: 20 }}>
      <Animated.View entering={enter}>
        <Label>HIIT Tracker</Label>
        <Heading style={{ fontSize: 64, lineHeight: 62, marginTop: 10 }}>
          Train.{'\n'}Track.{'\n'}
          <Text style={{ color: theme.color.accent }}>Improve.</Text>
        </Heading>
      </Animated.View>
      <Animated.View entering={enter}>
        <Body style={{ color: theme.color.muted, fontSize: 18, lineHeight: 28 }}>
          Your training.{'\n'}Your data.{'\n'}Your progress.
        </Body>
      </Animated.View>
    </View>
  );
}

function HowItWorks({ enter }: { enter?: Entering }) {
  return (
    <View style={{ gap: 16 }}>
      <Animated.View entering={enter}>
        <Heading>How it works</Heading>
        <Body style={{ marginTop: 8 }}>Three ideas. Nothing invented.</Body>
      </Animated.View>
      <ConceptCard
        enter={enter}
        delay={40}
        icon="flash"
        title="Train"
        body="Structured intervals. Follow work and rest without watching the clock."
      />
      <ConceptCard
        enter={enter}
        delay={90}
        icon="timer"
        title="Track"
        body="Record actual performance. Log real time, reps, and distance."
      />
      <ConceptCard
        enter={enter}
        delay={140}
        icon="trending-up"
        title="Improve"
        body="See your progress. Compare sessions and keep only legitimate PRs."
      />
    </View>
  );
}

function ConceptCard({
  icon,
  title,
  body,
  enter,
  delay,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  enter?: Entering;
  delay: number;
}) {
  const theme = useTheme();
  return (
    <Animated.View
      entering={
        enter && typeof enter === 'object' && 'delay' in enter && typeof enter.delay === 'function'
          ? (enter.delay(delay) as Entering)
          : enter
      }>
      <Card>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: theme.radius.sm,
              backgroundColor: theme.color.surface2,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name={icon} size={20} color={theme.color.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Label>{title}</Label>
            <Body style={{ marginTop: 6 }}>{body}</Body>
          </View>
        </View>
      </Card>
    </Animated.View>
  );
}

function TrainingPreferences({ enter }: { enter?: Entering }) {
  const { db, settings } = useVolt();
  return (
    <View style={{ gap: 20 }}>
      <Animated.View entering={enter}>
        <Heading>Set your defaults</Heading>
        <Body style={{ marginTop: 8 }}>Choose the settings you want to start with. You can change them anytime.</Body>
      </Animated.View>
      <Animated.View entering={enter} style={{ gap: 20 }}>
        <PresetRow
          label="Default work interval"
          options={WORK_PRESETS}
          value={settings.defaultWorkSeconds}
          format={(value) => `${value} sec`}
          onChange={(value) => void db.settings.update({ defaultWorkSeconds: value })}
        />
        <PresetRow
          label="Default rest interval"
          options={REST_PRESETS}
          value={settings.defaultRestSeconds}
          format={(value) => `${value} sec`}
          onChange={(value) => void db.settings.update({ defaultRestSeconds: value })}
        />
        <PresetRow
          label="Default rounds"
          options={ROUND_PRESETS}
          value={settings.defaultRounds}
          onChange={(value) => void db.settings.update({ defaultRounds: value })}
        />
      </Animated.View>
    </View>
  );
}

function DefaultPreview({
  enter,
  durationSeconds,
}: {
  enter?: Entering;
  durationSeconds: number;
}) {
  const { settings } = useVolt();
  const theme = useTheme();
  return (
    <View style={{ gap: 20 }}>
      <Animated.View entering={enter}>
        <Heading>Your default session</Heading>
        <Body style={{ marginTop: 8 }}>This is what those settings add up to — calculated by the same planner used in workouts.</Body>
      </Animated.View>
      <Animated.View entering={enter}>
        <Card>
          <Label>Your default session</Label>
          <View style={{ flexDirection: 'row', marginTop: 20, gap: 12 }}>
            <PreviewStat value={`${settings.defaultWorkSeconds}s`} label="Work" color={theme.color.accent} />
            <PreviewStat value={`${settings.defaultRestSeconds}s`} label="Rest" color={theme.color.rest} />
            <PreviewStat value={`× ${settings.defaultRounds}`} label="Rounds" />
          </View>
          <View style={{ marginTop: 24 }}>
            <Label>Estimated session duration</Label>
            <Strong style={{ fontFamily: theme.type.display, fontSize: 40, marginTop: 6 }}>
              {Units.formatCompactDuration(durationSeconds)}
            </Strong>
          </View>
        </Card>
      </Animated.View>
    </View>
  );
}

function PreviewStat({ value, label, color }: { value: string; label: string; color?: string }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontFamily: theme.type.display,
          color: color ?? theme.color.text,
          fontSize: 32,
          lineHeight: 34,
        }}>
        {value}
      </Text>
      <Label style={{ marginTop: 6 }}>{label}</Label>
    </View>
  );
}

function Cues({ enter }: { enter?: Entering }) {
  const { db, settings } = useVolt();
  return (
    <View style={{ gap: 16 }}>
      <Animated.View entering={enter}>
        <Heading>Train with feedback</Heading>
        <Body style={{ marginTop: 8 }}>Get cues when intervals change. Turn off anything you do not want.</Body>
      </Animated.View>
      <Animated.View entering={enter}>
        <Card>
          <Label>Sound</Label>
          <SettingToggle
            label="Sound"
            value={settings.soundEnabled}
            onChange={(value) => void db.settings.update({ soundEnabled: value })}
          />
          <SettingToggle
            label="Interval countdown"
            value={settings.countdownSound}
            onChange={(value) => void db.settings.update({ countdownSound: value })}
          />
          <SettingToggle
            label="Rest ending"
            value={settings.restEndingAlert}
            onChange={(value) => void db.settings.update({ restEndingAlert: value })}
          />
          <SettingToggle
            label="Workout complete"
            value={settings.completionSound}
            onChange={(value) => void db.settings.update({ completionSound: value })}
          />
        </Card>
      </Animated.View>
      <Animated.View entering={enter}>
        <Card>
          <Label>Haptics</Label>
          <SettingToggle
            label="Haptics"
            hint="Uses the device motor when available."
            value={settings.hapticsEnabled}
            onChange={(value) => void db.settings.update({ hapticsEnabled: value })}
          />
          <SettingToggle
            label="Interval changes"
            value={settings.hapticIntervalChanges !== false}
            onChange={(value) => void db.settings.update({ hapticIntervalChanges: value })}
          />
          <SettingToggle
            label="Countdown"
            value={settings.hapticCountdown !== false}
            onChange={(value) => void db.settings.update({ hapticCountdown: value })}
          />
          <SettingToggle
            label="Workout complete"
            value={settings.hapticComplete !== false}
            onChange={(value) => void db.settings.update({ hapticComplete: value })}
          />
        </Card>
      </Animated.View>
    </View>
  );
}

function Ready({
  enter,
  morning,
}: {
  enter?: Entering;
  morning: ReturnType<typeof morningHiitPreview> | null;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: 20 }}>
      <Animated.View entering={enter}>
        <Heading>You’re ready.</Heading>
        <Body style={{ marginTop: 8 }}>Your setup is complete. Your next session is waiting.</Body>
      </Animated.View>
      {morning ? (
        <Animated.View entering={enter}>
          <Card>
            <Label>Next session</Label>
            <Heading style={{ fontSize: 36, lineHeight: 38, marginTop: 8 }}>{morning.name}</Heading>
            <Body style={{ color: theme.color.muted, marginTop: 10 }}>
              {morning.rounds} rounds · {morning.workSeconds}s work · {morning.restSeconds}s rest · {morning.exercises}{' '}
              exercises
            </Body>
            <Strong style={{ fontFamily: theme.type.display, fontSize: 32, marginTop: 16 }}>
              {Units.formatCompactDuration(morning.durationSeconds)}
            </Strong>
          </Card>
        </Animated.View>
      ) : (
        <Card>
          <Body>Starter workout is missing. You can still go home and build one.</Body>
        </Card>
      )}
    </View>
  );
}
