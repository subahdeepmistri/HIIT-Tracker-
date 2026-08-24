/**
 * Row-level quarantine. A single malformed interval must never take down a
 * user's whole history. Every collection is validated row-by-row; bad rows are
 * isolated (and persisted to their own key for inspection/repair) while good
 * rows continue to load.
 */
import type { z } from 'zod';

import type {
  Exercise,
  IntervalSession,
  PerformanceRecord,
  PersonalRecord,
  TrainingDay,
  Workout,
  WorkoutExercise,
  WorkoutSession,
} from '../domain/types';
import {
  ExerciseSchema,
  IntervalSessionSchema,
  PerformanceRecordSchema,
  PersonalRecordSchema,
  TrainingDaySchema,
  WorkoutExerciseSchema,
  WorkoutSchema,
  WorkoutSessionSchema,
} from './validationSchemas';

export interface QuarantineEntry {
  collection: string;
  index: number;
  error: string;
  data: unknown;
  quarantinedAt: number;
}

export const QUARANTINE_CAP = 200;

export function validateRows<T>(
  collection: string,
  rows: unknown,
  schema: z.ZodType<T>,
): { rows: T[]; issues: QuarantineEntry[] } {
  if (!Array.isArray(rows)) return { rows: [], issues: [] };
  const valid: T[] = [];
  const issues: QuarantineEntry[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const result = schema.safeParse(rows[index]);
    if (result.success) {
      valid.push(result.data);
    } else {
      issues.push({
        collection,
        index,
        error: result.error.issues.map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`).join('; '),
        data: rows[index],
        quarantinedAt: Date.now(),
      });
    }
  }
  return { rows: valid, issues };
}

export interface SanitizedCollections {
  exercises: Exercise[];
  workouts: Workout[];
  workoutExercises: WorkoutExercise[];
  sessions: WorkoutSession[];
  intervals: IntervalSession[];
  performanceRecords: PerformanceRecord[];
  personalRecords: PersonalRecord[];
  trainingDays: TrainingDay[];
}

export interface SanitizeOutcome {
  collections: SanitizedCollections;
  quarantined: QuarantineEntry[];
  version: number | null;
}

const COLLECTION_SCHEMAS: Array<{
  name: keyof SanitizedCollections;
  schema: z.ZodType<unknown>;
}> = [
  { name: 'exercises', schema: ExerciseSchema },
  { name: 'workouts', schema: WorkoutSchema },
  { name: 'workoutExercises', schema: WorkoutExerciseSchema },
  { name: 'sessions', schema: WorkoutSessionSchema },
  { name: 'intervals', schema: IntervalSessionSchema },
  { name: 'performanceRecords', schema: PerformanceRecordSchema },
  { name: 'personalRecords', schema: PersonalRecordSchema },
  { name: 'trainingDays', schema: TrainingDaySchema },
];

/**
 * Take an already-parsed (untrusted) payload and produce per-collection valid
 * rows plus quarantine entries for everything rejected. Missing collections
 * become empty arrays — absence is not corruption.
 */
export function sanitizeSnapshotRows(parsed: unknown, now: number = Date.now()): SanitizeOutcome {
  const collections = {} as SanitizedCollections;
  const quarantined: QuarantineEntry[] = [];
  let version: number | null = null;

  if (parsed != null && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const rawVersion = (parsed as { version?: unknown }).version;
    version = typeof rawVersion === 'number' && Number.isFinite(rawVersion) ? rawVersion : null;
  }

  for (const { name, schema } of COLLECTION_SCHEMAS) {
    const source =
      parsed != null && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)[name]
        : undefined;
    // Re-stamp quarantinedAt so entries carry the time of THIS load attempt.
    const outcome = validateRows(name, source, schema as z.ZodType<never>);
    collections[name] = outcome.rows as never;
    for (const issue of outcome.issues) quarantined.push({ ...issue, quarantinedAt: now });
  }

  return { collections, quarantined, version };
}

/** Minimal storage contract so this module is testable without AsyncStorage. */
export interface QuarantineStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export async function readQuarantine(store: QuarantineStore, key: string): Promise<QuarantineEntry[]> {
  try {
    const raw = await store.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is QuarantineEntry =>
        row != null &&
        typeof row === 'object' &&
        typeof (row as QuarantineEntry).collection === 'string' &&
        typeof (row as QuarantineEntry).error === 'string',
    );
  } catch {
    return [];
  }
}

export async function appendQuarantine(
  store: QuarantineStore,
  key: string,
  incoming: QuarantineEntry[],
  existing?: QuarantineEntry[],
): Promise<void> {
  if (incoming.length === 0) return;
  try {
    const prior = existing ?? (await readQuarantine(store, key));
    const merged = [...incoming, ...prior].slice(0, QUARANTINE_CAP);
    await store.setItem(key, JSON.stringify(merged));
  } catch {
    // Quarantine persistence must never block loading good data.
  }
}
