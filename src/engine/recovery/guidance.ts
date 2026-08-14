import { isValue } from '../../domain/metrics';
import type { IntervalSession, WorkoutSession } from '../../domain/types';
import { calculateSessionMetrics } from '../calc/metrics';

export interface RecoveryGuidance {
  title: string;
  body: string;
  disclaimer: string;
}

const DISCLAIMER = 'Training suggestion — not medical advice.';

/**
 * Heuristic only. Uses recorded sessions from the last 48 hours.
 * No history → no card. Never invents intensity from exercise type.
 */
export function recoveryGuidance(
  sessions: Array<{ session: WorkoutSession; intervals: IntervalSession[] }>,
  now: number = Date.now(),
): RecoveryGuidance | null {
  const recent = sessions.filter((row) => {
    const end = row.session.endedAt ?? row.session.startedAt;
    return now - end <= 48 * 60 * 60 * 1000 && row.session.status !== 'CANCELLED';
  });
  if (recent.length === 0) return null;

  const latest = recent.reduce((best, row) =>
    (row.session.endedAt ?? row.session.startedAt) > (best.session.endedAt ?? best.session.startedAt) ? row : best,
  );

  if (latest.session.status === 'PARTIAL' || latest.session.status === 'CANCELLED') {
    return {
      title: 'Ready when you are',
      body: 'Last session was saved as partial. Resume when you want — no makeup required.',
      disclaimer: DISCLAIMER,
    };
  }

  const metrics = calculateSessionMetrics(latest.session, latest.intervals, latest.session.endedAt ?? now);
  const active = isValue(metrics.totalActiveSeconds) ? metrics.totalActiveSeconds.value : 0;
  const completion = isValue(metrics.workCompletionPercent) ? metrics.workCompletionPercent.value : 0;
  const density = isValue(metrics.workRest) ? metrics.workRest.value.label : null;

  const hard =
    active >= 12 * 60 &&
    completion >= 85 &&
    (density === 'High work density' || density === 'Continuous work');

  if (hard) {
    return {
      title: 'Consider a lighter day',
      body: 'Yesterday’s session stacked high work density with strong completion. Mobility or a shorter interval set is a reasonable next step.',
      disclaimer: DISCLAIMER,
    };
  }

  return {
    title: 'You can train',
    body: 'Recent recorded work looks moderate. Use today’s planned session, or keep it easy — both are valid.',
    disclaimer: DISCLAIMER,
  };
}
