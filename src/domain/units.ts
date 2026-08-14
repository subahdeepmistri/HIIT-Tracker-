import type { DistanceUnit } from './types';

const METERS_PER_MILE = 1609.344;

/** Centralized unit conversion. Do not duplicate these formulas. */
export const Units = {
  toMeters(value: number, unit: DistanceUnit): number {
    switch (unit) {
      case 'm':
        return value;
      case 'km':
        return value * 1000;
      case 'mi':
        return value * METERS_PER_MILE;
    }
  },

  fromMeters(meters: number, unit: DistanceUnit): number {
    switch (unit) {
      case 'm':
        return meters;
      case 'km':
        return meters / 1000;
      case 'mi':
        return meters / METERS_PER_MILE;
    }
  },

  secondsToMinutes(seconds: number): number {
    return seconds / 60;
  },

  minutesToSeconds(minutes: number): number {
    return minutes * 60;
  },

  formatSeconds(totalSeconds: number): string {
    const safe = Math.max(0, Math.round(totalSeconds));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const seconds = safe % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    return `${pad(minutes)}:${pad(seconds)}`;
  },

  formatTimer(remainingMs: number): string {
    const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    return Units.formatSeconds(totalSeconds);
  },

  formatCompactDuration(totalSeconds: number): string {
    const safe = Math.max(0, Math.round(totalSeconds));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const seconds = safe % 60;
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    if (minutes > 0) {
      return seconds > 0 && minutes < 10 ? `${minutes}m ${seconds}s` : `${minutes} min`;
    }
    return `${seconds}s`;
  },

  formatDistance(value: number, unit: DistanceUnit): string {
    const digits = unit === 'm' ? 0 : 2;
    return `${trimNumber(value, digits)} ${unit}`;
  },

  formatPercent(value: number): string {
    return `${trimNumber(value, 1)}%`;
  },

  formatRatio(ratio: number): string {
    const rounded = Number.isInteger(ratio) ? String(ratio) : trimNumber(ratio, 2);
    return `${rounded} : 1`;
  },
};

function trimNumber(value: number, digits: number): string {
  const factor = 10 ** digits;
  const rounded = Math.round(value * factor) / factor;
  return String(rounded);
}
