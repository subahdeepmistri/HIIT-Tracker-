export const darkColors = {
  bg: '#07080A',
  surface: '#111318',
  surface2: '#181C24',
  line: '#2A3140',
  text: '#F4F1EA',
  muted: '#9AA3B2',
  accent: '#E8FF3D',
  accentInk: '#111318',
  rest: '#7DD3FC',
  restInk: '#062033',
  warn: '#F5A524',
  danger: '#FF5A5A',
  success: '#3DDC97',
  info: '#60A5FA',
  overlay: 'rgba(7,8,10,0.72)',
};

export const lightColors = {
  bg: '#F6F4EE',
  surface: '#FFFFFF',
  surface2: '#EFECE4',
  line: '#D8D3C8',
  text: '#12141A',
  muted: '#4B5563',
  accent: '#E8FF3D',
  accentInk: '#111318',
  rest: '#0369A1',
  restInk: '#F0F9FF',
  warn: '#B45309',
  danger: '#DC2626',
  success: '#047857',
  info: '#2563EB',
  overlay: 'rgba(18,20,26,0.45)',
};

export type ColorTokens = typeof darkColors;

export const space = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  48: 48,
} as const;

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const type = {
  display: 'BarlowCondensed_700Bold, "Arial Narrow", Impact, sans-serif',
  ui: 'Barlow_500Medium, system-ui, sans-serif',
  uiStrong: 'Barlow_600SemiBold, system-ui, sans-serif',
  uiBook: 'Barlow_400Regular, system-ui, sans-serif',
} as const;

export const motion = {
  fast: 160,
  base: 220,
  slow: 320,
} as const;

export const touch = {
  min: 48,
  live: 64,
} as const;
