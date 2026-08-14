export interface Clock {
  now(): number;
}

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}

/** Deterministic clock for tests. Advance it instead of sleeping. */
export class FrozenClock implements Clock {
  constructor(private timestamp: number) {}

  now(): number {
    return this.timestamp;
  }

  set(timestamp: number): void {
    this.timestamp = timestamp;
  }

  advance(ms: number): void {
    this.timestamp += ms;
  }
}

export function remainingMs(targetEndAt: number, now: number): number {
  return Math.max(0, targetEndAt - now);
}

export function elapsedMs(startedAt: number, now: number): number {
  return Math.max(0, now - startedAt);
}
