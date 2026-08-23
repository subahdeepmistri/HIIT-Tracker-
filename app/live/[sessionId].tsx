import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DEFAULTS } from '@/src/config/defaults';
import { Units } from '@/src/domain/units';
import { KeepAwakeWhile, useVolt } from '@/src/features/app/VoltProvider';
import { demoIdForLiveView } from '@/src/features/live/exerciseDemoLogic';
import { ExerciseDemo } from '@/src/features/live/ExerciseDemo';
import { PhaseBadge } from '@/src/ui/components/PhaseBadge';
import { ProgressTrack } from '@/src/ui/components/ProgressTrack';
import { playCue } from '@/src/ui/cues';
import { confirmAction } from '@/src/ui/confirm';
import { useTheme } from '@/src/ui/theme/ThemeProvider';
import type { LiveView } from '@/src/engine/workout/stateMachine';

function viewKey(view: LiveView): string {
  return [
    view.phase,
    Math.ceil(view.remainingMs / 1000),
    view.slotIndex,
    view.currentReps,
    view.currentDistance,
    Math.round(view.workoutProgress * 100),
  ].join('|');
}

export default function LiveWorkoutScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const theme = useTheme();
  const router = useRouter();
  const { controller, settings, db } = useVolt();
  const [view, setView] = useState<LiveView>(controller.getView());
  const lastPhase = useRef(view.phase);
  const lastSecond = useRef(-1);
  const lastKey = useRef(viewKey(view));
  const finishing = useRef(false);

  const paint = useCallback(
    (next: LiveView) => {
      const key = viewKey(next);
      if (key === lastKey.current) return;
      lastKey.current = key;
      setView(next);
    },
    [],
  );

  useEffect(() => {
    let mounted = true;
    let pulsing = false;

    const pulse = async () => {
      if (!mounted || pulsing || finishing.current) return;
      pulsing = true;
      try {
        if (!controller.getState().sessionId) {
          const hydrated = await controller.hydrateFromStorage();
          if (!hydrated || !mounted) return;
        }
        const result = await controller.tick();
        if (!mounted) return;
        paint(controller.getView());
        if (result.finalized && !finishing.current) {
          finishing.current = true;
          router.replace(`/summary/${result.finalized.session.id}`);
        }
      } catch {
        if (mounted) paint(controller.getView());
      } finally {
        pulsing = false;
      }
    };

    void pulse();
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
  }, [controller, paint, router]);

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

  const apply = (action: () => void | Promise<unknown>) => {
    void Promise.resolve(action()).finally(() => {
      paint(controller.getView());
    });
  };

  const discardSession = () =>
    apply(async () => {
      const wasPaused = view.phase === 'PAUSED';
      if (!wasPaused) await controller.pause();
      const ok = await confirmAction(
        'Discard this session?',
        'This run will be deleted from this device. The workout plan stays. History will not keep this session.',
        'Yes, discard',
        { cancelLabel: 'Cancel', tone: 'danger' },
      );
      if (!ok) {
        if (!wasPaused) await controller.resume();
        return;
      }
      finishing.current = true;
      try {
        await controller.discard(sessionId as never);
        router.replace('/');
      } catch {
        finishing.current = false;
        paint(controller.getView());
      }
    });

  const isRest = view.phase === 'REST' || view.phase === 'TRANSITION';
  const background =
    view.phase === 'WORK' ? theme.color.bg : isRest ? '#07131C' : view.phase === 'PAUSED' ? '#1A1408' : theme.color.bg;
  const showReps = view.phase === 'WORK' && (view.trackingMode === 'REPS' || view.trackingMode === 'HYBRID') && view.plannedReps;
  const showDistance =
    view.phase === 'WORK' && (view.trackingMode === 'DISTANCE' || view.trackingMode === 'HYBRID') && view.plannedDistance;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: background }}>
      <KeepAwakeWhile active={view.phase !== 'COMPLETED' && view.phase !== 'CANCELLED'} />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 20, justifyContent: 'space-between', gap: 16 }}
        keyboardShouldPersistTaps="handled">
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <PhaseBadge phase={view.phase} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Discard session"
              onPress={discardSession}
              style={({ pressed }) => ({
                minHeight: 44,
                paddingHorizontal: 12,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}>
              <Text
                style={{
                  fontFamily: theme.type.uiStrong,
                  color: theme.color.danger,
                  fontSize: 16,
                }}>
                Discard
              </Text>
            </Pressable>
          </View>
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
              movementType={
                db.exercises.get((demoIdForLiveView(view) ?? '') as never)?.movementType
              }
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
            <ProgressTrack
              label="Rounds done"
              detail={view.roundDetail}
              value={view.roundProgress}
              color={theme.color.accent}
            />
            {view.repsDetail != null ? (
              <ProgressTrack
                label="Reps"
                detail={view.repsDetail}
                value={view.repsProgress}
                color={theme.color.accent}
              />
            ) : null}
            {view.distanceDetail != null ? (
              <ProgressTrack
                label="Distance"
                detail={view.distanceDetail}
                value={view.distanceProgress}
                color={theme.color.accent}
              />
            ) : null}
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
                onPress={() => apply(() => controller.recordReps(Math.max(0, view.currentReps - 1)))}
              />
              <Text style={{ fontFamily: theme.type.display, color: theme.color.text, fontSize: 48 }}>
                {view.currentReps}
              </Text>
              <LiveButton label="+" onPress={() => apply(() => controller.recordReps(view.currentReps + 1))} />
            </View>
          ) : null}
          {showDistance ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <LiveButton
                label="−"
                onPress={() =>
                  apply(() => controller.recordDistance(Math.max(0, Number((view.currentDistance - 0.1).toFixed(2)))))
                }
              />
              <Text style={{ fontFamily: theme.type.display, color: theme.color.text, fontSize: 36 }}>
                {view.currentDistance.toFixed(1)}
              </Text>
              <LiveButton
                label="+"
                onPress={() => apply(() => controller.recordDistance(Number((view.currentDistance + 0.1).toFixed(2))))}
              />
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <LiveButton
              label={view.phase === 'PAUSED' ? 'Resume' : 'Pause'}
              flex
              onPress={() => apply(() => (view.phase === 'PAUSED' ? controller.resume() : controller.pause()))}
            />
            <LiveButton label="Skip" flex onPress={() => apply(() => controller.skip())} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <LiveButton
              label="Finish"
              flex
              onPress={() =>
                apply(async () => {
                  const ok = await confirmAction(
                    'Finish workout?',
                    'This saves a partial session with everything recorded so far.',
                    'Finish',
                  );
                  if (!ok) return;
                  finishing.current = true;
                  try {
                    const result = await controller.savePartial();
                    router.replace(`/summary/${result.session.id}`);
                  } catch {
                    finishing.current = false;
                    paint(controller.getView());
                  }
                })
              }
            />
            <LiveButton label="Discard" flex danger onPress={discardSession} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const LiveButton = React.memo(function LiveButton({
  label,
  onPress,
  flex,
  danger,
}: {
  label: string;
  onPress: () => void;
  flex?: boolean;
  danger?: boolean;
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
        backgroundColor: danger ? 'transparent' : theme.color.surface,
        borderWidth: 1,
        borderColor: danger ? theme.color.danger : theme.color.line,
        opacity: pressed ? 0.8 : 1,
      })}>
      <Text
        style={{
          fontFamily: theme.type.uiStrong,
          color: danger ? theme.color.danger : theme.color.text,
          fontSize: 18,
        }}>
        {label}
      </Text>
    </Pressable>
  );
});
