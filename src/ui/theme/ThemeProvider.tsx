import { Barlow_400Regular } from '@expo-google-fonts/barlow/400Regular';
import { Barlow_500Medium } from '@expo-google-fonts/barlow/500Medium';
import { Barlow_600SemiBold } from '@expo-google-fonts/barlow/600SemiBold';
import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { useFonts } from 'expo-font';
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme as useSystemScheme } from 'react-native';

import type { ThemePreference } from '../../domain/types';
import { darkColors, lightColors, type ColorTokens, motion, radius, space, touch, type } from './tokens';

export interface Theme {
  scheme: 'light' | 'dark';
  color: ColorTokens;
  space: typeof space;
  radius: typeof radius;
  type: typeof type;
  motion: typeof motion;
  touch: typeof touch;
}

const ThemeContext = createContext<Theme | null>(null);

export function VoltThemeProvider({
  preference,
  children,
}: {
  preference: ThemePreference;
  children: React.ReactNode;
}) {
  const system = useSystemScheme();
  const scheme: 'light' | 'dark' =
    preference === 'system' ? (system === 'light' ? 'light' : 'dark') : preference;

  const theme = useMemo<Theme>(
    () => ({
      scheme,
      color: scheme === 'light' ? lightColors : darkColors,
      space,
      radius,
      type,
      motion,
      touch,
    }),
    [scheme],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside VoltThemeProvider');
  return theme;
}

export function useVoltFonts(): boolean {
  const [loaded, error] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    BarlowCondensed_700Bold,
  });
  return loaded || Boolean(error);
}
