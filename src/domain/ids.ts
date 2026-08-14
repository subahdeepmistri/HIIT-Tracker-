export type Brand<T, B extends string> = T & { readonly __brand: B };

export type UserId = Brand<string, 'UserId'>;
export type ExerciseId = Brand<string, 'ExerciseId'>;
export type WorkoutId = Brand<string, 'WorkoutId'>;
export type WorkoutExerciseId = Brand<string, 'WorkoutExerciseId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type IntervalId = Brand<string, 'IntervalId'>;
export type PerformanceRecordId = Brand<string, 'PerformanceRecordId'>;
export type PersonalRecordId = Brand<string, 'PersonalRecordId'>;

export function createId<T extends string>(): Brand<string, T> {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID() as Brand<string, T>;
  }
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}` as Brand<string, T>;
}

export const asId = <T extends string>(value: string): Brand<string, T> => value as Brand<string, T>;
