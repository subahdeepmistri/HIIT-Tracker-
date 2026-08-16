import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

import { VoltRoot, useVolt } from '@/src/features/app/VoltProvider';
import { installSafeBack } from '@/src/ui/safeBack';
import { useTheme } from '@/src/ui/theme/ThemeProvider';

export { ErrorBoundary } from 'expo-router';

installSafeBack();

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  return (
    <VoltRoot>
      <RootNav />
    </VoltRoot>
  );
}

function RootNav() {
  const theme = useTheme();
  const { settings } = useVolt();

  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.color.bg },
          animation: settings.reducedMotion ? 'none' : 'default',
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="workouts/[id]" />
        <Stack.Screen name="workouts/builder" />
        <Stack.Screen name="exercises/index" />
        <Stack.Screen name="exercises/create" />
        <Stack.Screen name="live/[sessionId]" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="summary/[sessionId]" />
        <Stack.Screen name="history/[sessionId]" />
        <Stack.Screen name="calendar" />
      </Stack>
    </>
  );
}
