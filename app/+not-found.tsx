import { Link, Stack } from 'expo-router';
import React from 'react';

import { Body, Heading, Screen } from '@/src/ui/components/primitives';

export default function NotFoundScreen() {
  return (
    <Screen style={{ alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Stack.Screen options={{ title: 'Not found', headerShown: true }} />
      <Heading>This screen is missing</Heading>
      <Link href="/" style={{ marginTop: 16 }}>
        <Body>Back to home</Body>
      </Link>
    </Screen>
  );
}
