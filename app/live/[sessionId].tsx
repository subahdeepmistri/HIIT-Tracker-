import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DEFAULTS } from '@/src/config/defaults';
import { Units } from '@/src/domain/units';
import { KeepAwakeWhile, useVolt } from '@/src/features/app/VoltProvider';
import { demoIdForLiveView } from '@/src/features/live/exerciseDemoLogic';
import { ExerciseDemo } from '@/src/features/live/ExerciseDemo';
import { PhaseBadge } from '@/src/ui/components/PhaseBadge';
import { ProgressTrack } from '@/src/ui/components/ProgressTrack';
import { playCue } from '@/src/ui/cues';
import { useTheme } from '@/src/ui/theme/ThemeProvider';
import type { LiveView } from '@/src/engine/workout/stateMachine';

export default function LiveWorkoutScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const theme = useTheme();
  const router = useRouter();
  const { controller, settings } = useVolt();
  const [view, setView] = useState<LiveView>(controller.getView());
  const lastPhase = useRef(view.phase);
  const lastSecond = useRef(-1);

  useEffect(() => {
    let mounted = true;
    const pulse = async () => {
      if (!controller.getState().sessionId) {
        const hydrated = await controller.hydrateFromStorage();
        if (!hydrated) return;
      }
      const result = await controller.tick();
      if (!mounted) return;
      const next = controller.getView();
      setView(next);
      if (result.finalized) {
        router.replace(`/summary/${result.finalized.session.id}`);
      }
    };

    const interval = setInterval(() => {
      void pulse();
    }, DEFAULTS.liveTickMs);

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        void controller.checkpoint();
      }
      if (state === 'active') void pulse();
    });

    return () => {
      mounted = false;
      clearInterval(interval);
      appState.remove();
    };
  }, [controller, router]);

  useEffect(() => {
    if (view.phase !== lastPhase.current) {
      if (view.phase === 'WORK') void playCue('work', settings);
      if (view.phase === 'REST') void playCue('tap', settings);
      if (view.phase === 'COMPLETED') void playCue('complete', settings);
      lastPhase.current = view.phase;
    }
    const seconds = Math.ceil(view.remainingMs / 1000);
    if (view.phase === 'COUNTDOWN' && seconds !== lastSecond.current && seconds > 0) {
      void playCue('countdown', settings);
      lastSecond.current = seconds;
    }
    if (view.phase === 'REST' && seconds === 3 && lastSecond.current !== 3) {
      void playCue('restEnding', settings);
      lastSecond.current = seconds;
    }
  }, [view, settings]);

  const isRest = view.phase === 'REST' || view.phase === 'TRANSITION';
  const background =
    view.phase === 'WORK' ? theme.color.bg : isRest ? '#07131C' : view.phase === 'PAUSED' ? '#1A1408' : theme.color.bg;
  const showReps = view.phase === 'WORK' && (view.trackingMode === 'REPS' || view.trackingMode === 'HYBRID') && view.plannedReps;
  const showDistance =
    view.phase === 'WORK' && (view.trackingMode === 'DISTANCE' || view.trackingMode === 'HYBRID') && view.plannedDistance;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: background }}>
      <KeepAwakeWhile active={view.phase !== 'COMPLETED' && view.phase !== 'CANCELLED'} />
      <View style={{ flex: 1, padding: 20, justifyContent: 'space-between' }}>
        <View style={{ gap: 10 }}>
          <PhaseBadge phase={view.phase} />
          <Text
            accessibilityRole="header"
            style={{
              fontFamily: theme.type.uiStrong,
              color: theme.color.muted,
              letterSpacing: 1.6,
              textTransform: 'uppercase',
              fontSize: 14,
            }}>
            Round {view.roundIndex} / {view.totalRounds}
          </Text>
          <Text
            style={{
              fontFamily: theme.type.display,
              color: theme.color.text,
              fontSize: 42,
              lineHeight: 44,
            }}>
            {view.phase === 'COUNTDOWN'
              ? 'Get ready'
              : view.phase === 'REST'
                ? 'Rest'
                : view.phase === 'ROUND_COMPLETE'
                  ? 'Round complete'
                  : view.currentExerciseName}
          </Text>
          {view.nextExerciseName ? (
            <Text style={{ fontFamily: theme.type.ui, color: theme.color.muted, fontSize: 18 }}>
              Next {view.nextExerciseName}
            </Text>
          ) : null}
          <View style={{ marginTop: 8, alignItems: 'flex-start' }}>
            <ExerciseDemo
              exerciseId={demoIdForLiveView(view)}
              caption={
                view.phase === 'REST' || view.phase === 'TRANSITION'
                  ? `Next · ${view.nextExerciseName ?? 'exercise'}`
                  : 'Form'
              }
              reducedMotion={settings.reducedMotion}
            />
          </View>
        </View>

        <View style={{ alignItems: 'center' }}>
          <Text
            accessibilityLabel={`Time remaining ${Units.formatTimer(view.remainingMs)}`}
            style={{
              fontFamily: theme.type.display,
              color: isRest ? theme.color.rest : theme.color.accent,
              fontSize: 112,
              lineHeight: 112,
              letterSpacing: -2,
            }}>
            {view.phase === 'COUNTDOWN' && Math.ceil(view.remainingMs / 1000) > 0
              ? Math.ceil(view.remainingMs / 1000)
              : Units.formatTimer(view.remainingMs)}
          </Text>
          <View style={{ width: '100%', marginTop: 16, gap: 14 }}>
            <ProgressTrack
              label={view.phase === 'COUNTDOWN' ? 'Countdown' : 'Interval'}
              detail={view.intervalDetail}
              value={view.intervalProgress}
              color={isRest ? theme.color.rest : theme.color.accent}
            />
            <ProgressTrack
              label="Workout"
              detail={view.workoutDetail}
              value={view.workoutProgress}
              color={theme.color.accent}
            />
          </View>
          {view.targetLabel ? (
            <Text
              style={{
                marginTop: 14,
                fontFamily: theme.type.uiStrong,
                color: theme.color.muted,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              }}>
              Target {view.targetLabel}
            </Text>
          ) : null}
        </View>

        <View style={{ gap: 12 }}>
          {showReps ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <LiveButton
                label="−"
                onPress={() => void controller.recordReps(Math.max(0, view.currentReps - 1))}
              />
              <Text style={{ fontFamily: theme.type.display, color: theme.color.text, fontSize: 48 }}>
                {view.currentReps}
              </Text>
              <LiveButton label="+" onPress={() => void controller.recordReps(view.currentReps + 1)} />
            </View>
          ) : null}
          {showDistance ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <LiveButton
                label="−"
                onPress={() => void controller.recordDistance(Math.max(0, Number((view.currentDistance - 0.1).toFixed(2))))}
              />
              <Text style={{ fontFamily: theme.type.display, color: theme.color.text, fontSize: 36 }}>
                {view.currentDistance.toFixed(1)}
              </Text>
              <LiveButton
                label="+"
                onPress={() => void controller.recordDistance(Number((view.currentDistance + 0.1).toFixed(2)))}
              />
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <LiveButton
              label={view.phase === 'PAUSED' ? 'Resume' : 'Pause'}
              flex
              onPress={() => void (view.phase === 'PAUSED' ? controller.resume() : controller.pause())}
            />
            <LiveButton label="Skip" flex onPress={() => void controller.skip()} />
          </View>
          <LiveButton
            label="Finish"
            onPress={() => {
              Alert.alert('Finish workout?', 'This saves a partial session with everything recorded so far.', [
                { text: 'Keep going', style: 'cancel' },
                {
                  text: 'Finish',
                  onPress: async () => {
                    const result = await controller.savePartial();
                    router.replace(`/summary/${result.session.id}`);
                  },
                },
              ]);
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function LiveButton({
  label,
  onPress,
  flex,
}: {
  label: string;
  onPress: () => void;
  flex?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: flex ? 1 : undefined,
        minHeight: 64,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.color.surface,
        borderWidth: 1,
        borderColor: theme.color.line,
        opacity: pressed ? 0.8 : 1,
      })}>
      <Text style={{ fontFamily: theme.type.uiStrong, color: theme.color.text, fontSize: 18 }}>{label}</Text>
    </Pressable>
  );
}
