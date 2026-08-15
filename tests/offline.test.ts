import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorkoutController } from '../src/application/workoutController';
import { asId } from '../src/domain/ids';
import type {
  IntervalSession,
  PerformanceRecord,
  PersonalRecord,
  Workout,
  WorkoutPlan,
  WorkoutSession,
} from '../src/domain/types';
import { FrozenClock } from '../src/engine/clock/timestampClock';

describe('offline live workout', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts, times, completes, and persists a session with network disabled', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('network disabled');
    });
    vi.stubGlobal('fetch', fetchMock);

    const clock = new FrozenClock(1_000);
    const liveStore = new Map<string, string>();
    const db = memoryDatabase();
    const controller = new WorkoutController({
      db: db as never,
      clock,
      persistLive: async (json) => {
        if (json == null) liveStore.delete('live');
        else liveStore.set('live', json);
      },
      loadLive: async () => liveStore.get('live') ?? null,
    });

    await controller.start(tinyPlan(), 3, true);
    expect(db.sessions.list()).toHaveLength(1);
    expect(db.sessions.list()[0]?.status).toBe('IN_PROGRESS');

    clock.advance(3_000);
    await controller.tick();
    expect(controller.getView().phase).toBe('WORK');

    clock.advance(10_000);
    await controller.tick();
    expect(controller.getView().remainingMs).toBe(30_000);

    clock.advance(30_000);
    const result = await controller.tick();
    expect(result.finalized).toBeDefined();
    expect(result.finalized?.session.status).toBe('COMPLETED');
    expect(result.finalized?.performance.totalDurationSeconds).toBe(40);
    expect(result.finalized?.performance.totalDurationSeconds).not.toBe(43);
    expect(db.sessions.list()[0]?.status).toBe('COMPLETED');
    expect(db.performance.list()).toHaveLength(1);
    expect(liveStore.size).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function tinyPlan(): WorkoutPlan {
  const workout: Workout = {
    id: asId('wo-offline'),
    name: 'Offline Check',
    notes: '',
    rounds: 1,
    isArchived: false,
    createdAt: 0,
    updatedAt: 0,
  };
  return {
    workout,
    exercises: [
      {
        id: asId('we-offline'),
        workoutId: workout.id,
        exerciseId: asId('ex-offline'),
        orderIndex: 0,
        trackingMode: 'TIME',
        plannedWorkSeconds: 40,
        plannedRestSeconds: 0,
        exercise: {
          id: asId('ex-offline'),
          name: 'Sprint',
          category: 'Cardio',
          movementType: 'locomotion',
          equipment: ['none'],
          defaultWorkDurationSeconds: 40,
          defaultRestDurationSeconds: 0,
          trackingMode: 'TIME',
          instructions: '',
          safetyNotes: '',
          difficulty: 1,
          isCustom: false,
          createdAt: 0,
          updatedAt: 0,
        },
      },
    ],
  };
}

function memoryDatabase() {
  const sessions: WorkoutSession[] = [];
  const intervals = new Map<string, IntervalSession[]>();
  const performance: PerformanceRecord[] = [];
  let records: PersonalRecord[] = [];
  return {
    sessions: {
      list: () => [...sessions],
      get: (id: WorkoutSession['id']) => sessions.find((row) => row.id === id),
      upsert: async (session: WorkoutSession) => {
        const index = sessions.findIndex((row) => row.id === session.id);
        if (index >= 0) sessions[index] = session;
        else sessions.push(session);
      },
      remove: async (id: WorkoutSession['id']) => {
        const index = sessions.findIndex((row) => row.id === id);
        if (index >= 0) sessions.splice(index, 1);
      },
    },
    intervals: {
      listBySession: (id: WorkoutSession['id']) => intervals.get(id) ?? [],
      replaceSession: async (id: WorkoutSession['id'], rows: IntervalSession[]) => {
        intervals.set(id, rows);
      },
      removeBySession: async (id: WorkoutSession['id']) => {
        intervals.delete(id);
      },
    },
    performance: {
      list: () => [...performance],
      getBySession: (id: WorkoutSession['id']) => performance.find((row) => row.sessionId === id),
      upsert: async (record: PerformanceRecord) => {
        const index = performance.findIndex((row) => row.id === record.id);
        if (index >= 0) performance[index] = record;
        else performance.push(record);
      },
    },
    records: {
      list: () => records,
      replaceAll: async (rows: PersonalRecord[]) => {
        records = rows;
      },
    },
    trainingDays: {
      syncFromSessions: async () => undefined,
    },
  };
}
