import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The real package cannot load outside React Native; every test injects its own
// FakeKV through the VoltDatabase constructor, so a inert stub satisfies imports.
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async () => null,
    setItem: async () => undefined,
    removeItem: async () => undefined,
  },
}));

import { DEFAULTS } from '../src/config/defaults';
import {
  defaultSettings,
  emptySnapshot,
  QUARANTINE_KEY,
  VoltDatabase,
  type KeyValueStore,
} from '../src/data/database';
import { classifyStorageError, safeParse, safeStringify } from '../src/data/serialize';
import { appendQuarantine, sanitizeSnapshotRows, QUARANTINE_CAP } from '../src/data/quarantine';
import type { IntervalSession, PerformanceRecord, WorkoutSession } from '../src/domain/types';
import { asId } from '../src/domain/ids';

// ---------------------------------------------------------------------------
// Fake KV store
// ---------------------------------------------------------------------------

class FakeKV implements KeyValueStore {
  private map = new Map<string, string>();
  calls: string[] = [];
  failSetWith: Error | null = null;

  async getItem(key: string): Promise<string | null> {
    this.calls.push(`get:${key}`);
    return this.map.get(key) ?? null;
  }
  async setItem(key: string, value: string): Promise<void> {
    this.calls.push(`set:${key}`);
    if (this.failSetWith) throw this.failSetWith;
    this.map.set(key, value);
  }
  async removeItem(key: string): Promise<void> {
    this.calls.push(`remove:${key}`);
    this.map.delete(key);
  }
  peek(key: string): string | null {
    return this.map.get(key) ?? null;
  }
}

function freshDb(kv: FakeKV): VoltDatabase {
  return new VoltDatabase(kv);
}

function baseRawPayload(overrides?: Partial<Record<string, unknown>>): Record<string, unknown> {
  return {
    version: 2,
    user: { id: 'user-1', createdAt: 1000 },
    settings: defaultSettings(),
    exercises: [],
    workouts: [],
    workoutExercises: [],
    sessions: [],
    intervals: [],
    performanceRecords: [],
    personalRecords: [],
    trainingDays: [],
    ...overrides,
  };
}

export function makeSession(id: string, overrides?: Partial<WorkoutSession>): WorkoutSession {
  return {
    id: asId(id),
    workoutId: asId('wo-1'),
    workoutNameSnapshot: 'Morning HIIT',
    status: 'COMPLETED',
    startedAt: 1000,
    endedAt: 2000,
    countdownSecondsUsed: 3,
    plannedRounds: 2,
    plannedExerciseCount: 3,
    averageHeartRate: null,
    maximumHeartRate: null,
    heartRateSamplesJson: null,
    ...overrides,
  };
}

export function makeInterval(sessionId: string, overrides?: Partial<IntervalSession>): IntervalSession {
  return {
    id: asId(`${sessionId}:slot`),
    sessionId: asId(sessionId),
    exerciseId: asId('ex-1'),
    exerciseNameSnapshot: 'Burpees',
    roundIndex: 1,
    exerciseIndex: 0,
    phase: 'WORK',
    plannedSeconds: 30,
    actualSeconds: 30,
    startedAt: 1100,
    endedAt: 1130,
    outcome: 'COMPLETED',
    ...overrides,
  };
}

export function makePerformance(
  sessionId: string,
  overrides?: Partial<PerformanceRecord>,
): PerformanceRecord {
  return {
    id: asId(`perf-${sessionId}`),
    sessionId: asId(sessionId),
    workoutId: asId('wo-1'),
    createdAt: 2000,
    totalDurationSeconds: 900,
    totalActiveSeconds: 600,
    totalRestSeconds: 300,
    exerciseCount: 3,
    completedRounds: 2,
    completedIntervals: 6,
    plannedWorkSeconds: 600,
    plannedRestSeconds: 300,
    ...overrides,
  };
}

export function makeExercise(id: string): import('../src/domain/types').Exercise {
  return {
    id: asId(id),
    name: 'Burpees',
    category: 'Conditioning',
    movementType: 'plyometric',
    equipment: ['none'],
    defaultWorkDurationSeconds: 30,
    defaultRestDurationSeconds: 15,
    trackingMode: 'TIME',
    instructions: '',
    safetyNotes: '',
    difficulty: 3,
    isCustom: false,
    createdAt: 1000,
    updatedAt: 1000,
  };
}

beforeEach(() => {});
afterEach(() => {});

// ---------------------------------------------------------------------------
// serialize.ts
// ---------------------------------------------------------------------------

describe('safeParse', () => {
  it('parses valid JSON', () => {
    const result = safeParse<{ a: number }>('{"a":1}');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.a).toBe(1);
  });

  it('rejects malformed JSON with a reason, never throws', () => {
    expect(safeParse('{not json').ok).toBe(false);
    expect(safeParse('').ok).toBe(false);
    expect(safeParse(null).ok).toBe(false);
    expect(safeParse(undefined).ok).toBe(false);
    const bad = safeParse('nope');
    if (!bad.ok) expect(bad.reason.startsWith('invalid-json')).toBe(true);
  });
});

describe('safeStringify', () => {
  it('round-trips ordinary payloads', () => {
    const value = { a: 1, b: 'x', c: [1, 2, { d: true }] };
    const result = safeStringify(value);
    expect(result.ok).toBe(true);
    if (result.ok) expect(JSON.parse(result.json)).toEqual(value);
  });

  it('rejects circular structures with a path', () => {
    const obj: Record<string, unknown> = { name: 'root' };
    obj['self'] = obj;
    const result = safeStringify(obj);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('circular-reference');
  });

  it('rejects NaN and Infinity before they silently become null', () => {
    expect(safeStringify({ score: Number.NaN }).ok).toBe(false);
    expect(safeStringify({ ratio: Number.POSITIVE_INFINITY }).ok).toBe(false);
    expect(safeStringify([Number.NEGATIVE_INFINITY]).ok).toBe(false);
  });

  it('rejects undefined inside arrays', () => {
    const result = safeStringify({ list: [1, undefined, 2] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('undefined-in-array');
  });

  it('allows undefined object properties (normal optional fields)', () => {
    const result = safeStringify({ required: 1, maybe: undefined });
    expect(result.ok).toBe(true);
  });
});

describe('classifyStorageError', () => {
  it('recognises quota failures', () => {
    const err = new Error('QuotaExceededError: DOM Exception 22');
    expect(classifyStorageError(err).kind).toBe('quota');
  });
  it('recognises unavailable storage (private mode)', () => {
    const err = new Error('SecurityError: The document is sandboxed and lacks the allow-same-origin flag');
    expect(classifyStorageError(err).kind).toBe('unavailable');
  });
  it('leaves unknown errors verbatim', () => {
    expect(classifyStorageError(new Error('weird')).kind).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// quarantine.ts
// ---------------------------------------------------------------------------

describe('sanitizeSnapshotRows', () => {
  it('keeps valid rows and isolates malformed ones per collection', () => {
    const good = makeSession('s-good');
    const bad = { id: 's-bad', status: 'NOT_A_STATUS' };
    const outcome = sanitizeSnapshotRows({
      ...baseRawPayload(),
      sessions: [good, bad],
      intervals: [makeInterval('s-good'), { nonsense: true }],
    });

    expect(outcome.collections.sessions).toHaveLength(1);
    expect(outcome.collections.sessions[0].id).toBe(good.id);
    expect(outcome.collections.intervals).toHaveLength(1);

    const quarantinedCollections = outcome.quarantined.map((q) => q.collection).sort();
    expect(quarantinedCollections).toEqual(['intervals', 'sessions']);
    expect(outcome.version).toBe(2);
  });

  it('treats missing collections as empty, not corrupt', () => {
    const outcome = sanitizeSnapshotRows({ version: 2, user: { id: 'u' } });
    expect(outcome.collections.sessions).toEqual([]);
    expect(outcome.collections.exercises).toEqual([]);
    expect(outcome.quarantined).toHaveLength(0);
  });

  it('survives completely non-object payloads', () => {
    const outcome = sanitizeSnapshotRows('just a string');
    expect(outcome.collections.sessions).toEqual([]);
    expect(outcome.version).toBeNull();
  });
});

describe('quarantine persistence', () => {
  it('caps stored entries at QUARANTINE_CAP', async () => {
    const kv = new FakeKV();
    const entries = Array.from({ length: QUARANTINE_CAP + 50 }, (_, i) => ({
      collection: 'sessions',
      index: i,
      error: 'test',
      data: null,
      quarantinedAt: i,
    }));
    await appendQuarantine(kv, 'q-key', entries);
    const stored = JSON.parse(kv.peek('q-key') ?? '[]') as unknown[];
    expect(stored.length).toBe(QUARANTINE_CAP);
  });

  it('never throws even when the store itself fails', async () => {
    const kv = new FakeKV();
    kv.failSetWith = new Error('quota blown');
    await expect(
      appendQuarantine(kv, 'q-key', [
        { collection: 'x', index: 0, error: 'e', data: null, quarantinedAt: 1 },
      ]),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// VoltDatabase: init paths
// ---------------------------------------------------------------------------

describe('VoltDatabase.init', () => {
  it('seeds a fresh install and persists it (explicit empty state)', async () => {
    const kv = new FakeKV();
    const db = freshDb(kv);
    const outcome = await db.init();
    expect(outcome.source).toBe('fresh');
    expect(db.snapshot.version).toBe(2);
    // Starter content is intended behaviour on first run, never an error state.
    expect(db.snapshot.exercises.length).toBeGreaterThan(0);
    expect(db.snapshot.sessions).toEqual([]);
    expect(kv.peek(DEFAULTS.storageKey)).not.toBeNull();
  });

  it('recovers from corrupt JSON instead of throwing, preserving bytes for inspection', async () => {
    const kv = new FakeKV();
    const corrupted = '{"version":2,"sessions":[{"id":"partial"';
    await kv.setItem(DEFAULTS.storageKey, corrupted);

    const db = freshDb(kv);
    const outcome = await db.init();

    expect(outcome.source).toBe('corrupt');
    expect(db.snapshot.sessions).toEqual([]);
    expect(kv.peek(`${DEFAULTS.storageKey}:corrupt-backup`)).toBe(corrupted);
  });

  it('quarantines a single bad row while loading every other session', async () => {
    const kv = new FakeKV();
    const good = makeSession('s-good');
    const interval = makeInterval('s-good', { exerciseId: asId('ex-burpees') });
    const badRow = { id: 's-bad', startedAt: 'not-a-number' };
    // Derive from a coherent snapshot so untouched collections keep their
    // references; only sessions/intervals are deliberately tampered with.
    const payload = { ...JSON.parse(JSON.stringify(emptySnapshot())), sessions: [good, badRow], intervals: [interval] };
    await kv.setItem(DEFAULTS.storageKey, JSON.stringify(payload));

    const db = freshDb(kv);
    const outcome = await db.init();

    expect(outcome.source).toBe('loaded');
    expect(outcome.quarantined).toBe(1);
    expect(db.sessions.list().map((s) => s.id)).toEqual([good.id]);
    expect(db.getQuarantinedRows()[0]?.collection).toBe('sessions');
    // Quarantine persisted for inspection under its own key.
    expect(kv.peek(QUARANTINE_KEY)).toContain('sessions');

    // The surviving interval references a session whose row loaded fine.
    const integrity = db.validateIntegrity();
    expect(integrity.issues, integrity.issues.join(' | ')).toEqual([]);
  });

  it('backs up pre-migration bytes before migrating v1 data forward', async () => {
    const kv = new FakeKV();
    // v1-era payload: durations recorded before the v2 recalculation existed.
    const v1Payload = baseRawPayload({
      version: 1,
      sessions: [makeSession('s-old')],
      intervals: [makeInterval('s-old')],
      performanceRecords: [makePerformance('s-old', { totalActiveSeconds: 0, totalRestSeconds: 0 })],
    });
    const rawV1 = JSON.stringify(v1Payload);
    await kv.setItem(DEFAULTS.storageKey, rawV1);

    const db = freshDb(kv);
    const outcome = await db.init();

    expect(outcome.source).toBe('loaded');
    expect(db.snapshot.version).toBe(2);
    expect(kv.peek(`${DEFAULTS.storageKey}:pre-migration-backup`)).toBe(rawV1);
    // Migration recomputed active/rest seconds from interval rows.
    expect(db.snapshot.performanceRecords[0].totalActiveSeconds).toBe(30);
    expect(db.snapshot.performanceRecords[0].totalRestSeconds).toBe(0);
  });

  it('preserves data written by a FUTURE version (never downgrades or discards)', async () => {
    const kv = new FakeKV();
    const future = baseRawPayload({ version: 99, sessions: [makeSession('s-future')] });
    await kv.setItem(DEFAULTS.storageKey, JSON.stringify(future));

    const db = freshDb(kv);
    await db.init();

    expect(db.snapshot.version).toBe(99);
    expect(db.snapshot.sessions.map((s) => String(s.id))).toContain('s-future');
  });
});

// ---------------------------------------------------------------------------
// VoltDatabase: write guarantees
// ---------------------------------------------------------------------------

describe('VoltDatabase.save', () => {
  it('serializes concurrent saves into ordered, non-interleaved writes', async () => {
    const kv = new FakeKV();
    const db = freshDb(kv);
    await db.init();

    const p1 = db.sessions.upsert(makeSession('s-1'));
    const p2 = db.sessions.upsert(makeSession('s-2'));
    const p3 = db.sessions.upsert(makeSession('s-3'));
    await Promise.all([p1, p2, p3]);
    await db.flushWrites();

    const setCalls = kv.calls.filter((c) => c === `set:${DEFAULTS.storageKey}`);
    expect(setCalls.length).toBeGreaterThanOrEqual(3);
    const final = JSON.parse(kv.peek(DEFAULTS.storageKey) ?? '{}') as { sessions: Array<{ id: string }> };
    expect(final.sessions.map((s) => s.id).sort()).toEqual(['s-1', 's-2', 's-3']);
  });

  it('refuses to persist non-finite values instead of writing silent nulls', async () => {
    const kv = new FakeKV();
    const db = freshDb(kv);
    await db.init();
    await db.sessions.upsert(makeSession('s-x'));
    await db.intervals.replaceSession(asId('s-x'), [makeInterval('s-x')]);

    (db.snapshot.intervals[0] as { actualSeconds: number }).actualSeconds = Number.NaN;

    const result = await db.save();
    expect(result.success).toBe(false);
    expect(db.getLastSaveFailure()?.kind).toBe('serialize');
  });

  it('classifies quota exhaustion honestly', async () => {
    const kv = new FakeKV();
    const db = freshDb(kv);
    await db.init();

    kv.failSetWith = Object.assign(new Error('QuotaExceededError'), { name: 'QuotaExceededError' });
    // Collection mutators return void by design; failure state is the observable.
    await db.sessions.upsert(makeSession('s-full'));

    expect(db.getLastSaveFailure()?.kind).toBe('quota');
    expect(db.getLastSaveError()).toContain('quota');
  });

  it('clears failure state after a successful retry', async () => {
    const kv = new FakeKV();
    const db = freshDb(kv);
    await db.init();
    kv.failSetWith = new Error('QuotaExceededError');
    await db.save();
    expect(db.getLastSaveFailure()).not.toBeNull();

    kv.failSetWith = null;
    const retry = await db.save();
    expect(retry.success).toBe(true);
    expect(db.getLastSaveFailure()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Cross-tab reload
// ---------------------------------------------------------------------------

describe('VoltDatabase.reloadFromStorage', () => {
  it('applies another context\'s write into the live instance', async () => {
    const kv = new FakeKV();
    const db = freshDb(kv);
    await db.init(); // tab A starts empty

    // Tab B writes a snapshot containing a new session.
    const external = emptySnapshot();
    external.user.id = asId('other-user'); // different instance, own uuid
    external.sessions = [makeSession('s-from-tab-B')];
    await kv.setItem(DEFAULTS.storageKey, JSON.stringify(external));

    const result = await db.reloadFromStorage();

    expect(result).toBe('applied');
    expect(db.sessions.list().map((s) => String(s.id))).toContain('s-from-tab-B');
  });

  it('ignores corrupt external events without nuking in-memory state', async () => {
    const kv = new FakeKV();
    const db = freshDb(kv);
    await db.init();
    await db.sessions.upsert(makeSession('s-keep'));

    const result = await db.reloadFromStorage('{truncated');

    expect(result).toBe('ignored');
    expect(db.sessions.list().map((s) => String(s.id))).toContain('s-keep');
  });

  it('mirrors an external clear as a fresh install', async () => {
    const kv = new FakeKV();
    const db = freshDb(kv);
    await db.init();
    await db.sessions.upsert(makeSession('s-gone'));

    await kv.removeItem(DEFAULTS.storageKey);
    const result = await db.reloadFromStorage();

    expect(result).toBe('fresh');
    expect(db.snapshot.sessions).toEqual([]);
  });

  it('does not echo a write back when applied content is identical', async () => {
    const kv = new FakeKV();
    const db = freshDb(kv);
    await db.init();

    const external = JSON.parse(kv.peek(DEFAULTS.storageKey) ?? '{}') as Record<string, unknown>;
    await db.reloadFromStorage(JSON.stringify(external));
    const callsAfterFirst = kv.calls.filter((c) => c === `set:${DEFAULTS.storageKey}`).length;

    await db.reloadFromStorage(JSON.stringify(external));
    const callsAfterSecond = kv.calls.filter((c) => c === `set:${DEFAULTS.storageKey}`).length;

    expect(callsAfterSecond).toBe(callsAfterFirst);
  });

  it('writes back once when migration changed the incoming payload', async () => {
    const kv = new FakeKV();
    const db = freshDb(kv);
    await db.init();

    const v1 = baseRawPayload({ version: 1, sessions: [makeSession('s-v1')] });
    const before = kv.calls.filter((c) => c === `set:${DEFAULTS.storageKey}`).length;
    const result = await db.reloadFromStorage(JSON.stringify(v1));

    const after = kv.calls.filter((c) => c === `set:${DEFAULTS.storageKey}`).length;
    expect(result).toBe('applied');
    expect(after).toBe(before + 1);
    expect(db.snapshot.version).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// IDs survive reload and cannot collide (contract spot-check)
// ---------------------------------------------------------------------------

describe('identifier stability', () => {
  it('keeps ids stable across a save/load round-trip', async () => {
    const kv = new FakeKV();
    const dbA = freshDb(kv);
    await dbA.init();
    const session = makeSession('s-roundtrip');
    session.id = asId('generated-id-1234');
    await dbA.sessions.upsert(session);

    const dbB = freshDb(kv);
    await dbB.init();
    expect(dbB.sessions.get(asId('generated-id-1234'))).toBeDefined();
  });
});
