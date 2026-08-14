export type Metric<T> =
  | { kind: 'value'; value: T }
  | { kind: 'insufficient'; reason: string };

export const value = <T>(v: T): Metric<T> => ({ kind: 'value', value: v });

export const insufficient = (reason: string): Metric<never> => ({
  kind: 'insufficient',
  reason,
});

export function isValue<T>(metric: Metric<T>): metric is { kind: 'value'; value: T } {
  return metric.kind === 'value';
}

export function unwrapOrNull<T>(metric: Metric<T>): T | null {
  return metric.kind === 'value' ? metric.value : null;
}

export const NOT_ENOUGH_DATA = 'Not enough data';
