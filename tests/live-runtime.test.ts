import { describe, expect, it } from 'vitest';

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

describe('live runtime isolation', () => {
  it('advances the clock even when persistence hangs', async () => {
    const clock = new FrozenClock(0);
    const controller = new WorkoutController({
      db: memoryDatabase() as never,
      clock,
      persistLive: () => new Promise(() => undefined),
    });

    await controller.start(tinyPlan(), 3, true);
    clock.advance(3_000);
    const first = controller.tick();
    clock.advance(10_000);
    const second = controller.tick();
    expect(controller.getView().phase).toBe('WORK');
    expect(controller.getView().remainingMs).toBe(30_000);
    await Promise.race([first, second, Promise.resolve()]);
  });

  it('keeps ticking after persistence throws', async () => {
    const clock = new FrozenClock(0);
    const controller = new WorkoutController({
      db: memoryDatabase() as never,
      clock,
      persistLive: async () => {
        throw new Error('quota exceeded');
      },
    });

    await controller.start(tinyPlan(), 3, true);
    clock.advance(3_000);
    await expect(controller.tick()).resolves.toMatchObject({ state: expect.anything() });
    expect(controller.getView().phase).toBe('WORK');
    clock.advance(5_000);
    await controller.tick();
    expect(controller.getView().remainingMs).toBe(35_000);
    controller.pause();
    expect(controller.getView().phase).toBe('PAUSED');
    controller.resume();
    expect(controller.getView().phase).toBe('WORK');
  });

  it('finishes a live workout even when the session row is missing', async () => {
    const clock = new FrozenClock(0);
    const db = memoryDatabase();
    const controller = new WorkoutController({
      db: db as never,
      clock,
      persistLive: async () => undefined,
    });

    await controller.start(tinyPlan(), 0, true);
    db.sessions.remove(controller.getState().sessionId as WorkoutSession['id']);
    clock.advance(10_000);
    const result = await controller.savePartial();
    expect(result.session.status).toBe('PARTIAL');
    expect(result.session.id).toBeTruthy();
    expect(db.sessions.list()).toHaveLength(1);
  });

  it('discards a wrongly started session so it is not saved to history', async () => {
    const clock = new FrozenClock(0);
    const db = memoryDatabase();
    const live = { json: 'occupied' };
    const controller = new WorkoutController({
      db: db as never,
      clock,
      persistLive: async (json) => {
        live.json = json ?? '';
      },
    });

    await controller.start(tinyPlan(), 3, true);
    expect(db.sessions.list()).toHaveLength(1);
    await controller.discard();
    expect(db.sessions.list()).toHaveLength(0);
    expect(controller.getView().phase).toBe('IDLE');
    expect(live.json).toBe('');
  });
});

function tinyPlan(): WorkoutPlan {
  const workout: Workout = {
    id: asId('wo-runtime'),
    name: 'Runtime',
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
        id: asId('we-runtime'),
        workoutId: workout.id,
        exerciseId: asId('ex-runtime'),
        orderIndex: 0,
        trackingMode: 'TIME',
        plannedWorkSeconds: 40,
        plannedRestSeconds: 0,
        exercise: {
          id: asId('ex-runtime'),
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
        performance.push(record);
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
