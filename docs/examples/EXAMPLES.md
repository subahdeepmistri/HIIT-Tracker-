# Component Usage Examples

Copy-paste patterns against the **shipped** canonical library (`@/src/ui/components`). Every data-region example shows its empty and error states — per the Phase 2.4 rule that those are API states, not afterthoughts.

---

## StateBoundary — the standard way to render any loaded region

```tsx
import { StateBoundary, type ViewState } from '@/src/ui/components';

type Range = '7' | '30' | '90' | 'all';

function HistoryRegion({ range }: { range: Range }) {
  const { db } = useVolt();

  // Build the state EXPLICITLY. No guessing from undefined.
  const state: ViewState<WorkoutSession[]> = (() => {
    try {
      const sessions = db.sessions.list().filter(isFinished);
      return sessions.length === 0
        ? { kind: 'empty',
            title: 'No sessions yet',
            body: 'Completed and partial workouts will land here. Nothing is invented to fill this list.',
            action: <Button label="Start a workout" onPress={start} /> }
        : { kind: 'data', data: sessions };
    } catch (e) {
      return { kind: 'error', message: String(e), retry: () => refresh() };
    }
  })();

  return <StateBoundary state={state} loadingLabel="Loading history" render={(rows) => <SessionRows rows={rows} />} />;
}
```

Renders: spinner+“Loading history” → honest empty copy (with CTA) → warn card `⚠️ Couldn’t load this` + **Try again** → the real list.

---

## ProgressBar / ProgressTrack — one component, four truthful states

```tsx
// 1. Real value (fill + ARIA now)
<ProgressBar label="Work" detail="82%" value={0.82} caption="49s / 60s" />

// 2. NO DATA — null is meaningful; renders muted track + spoken “Not enough data”
<ProgressBar label="Reps" detail="Not enough data" value={null} />

// 3. Over plan — clamped fill, visible caption, still exposes true %
<ProgressBar label="Reps" detail="120%" value={1.2} caption="24 / 20 · over plan" />

// 4. Recorded-without-target — distinct info style, never faked as success
<ProgressBar label="Plank hold" detail="42s" value={null} showAsRecordedOnly />
```

Inline variant for rows: `<ProgressBarInline value={record ? pct : null} accessibilityLabel="Morning HIIT completion" />`

## Stat / StatCard — hero styling only for real numbers

```tsx
<Stat label="Streak" value={`${stats.streak} days`} />
<Stat label="Total reps" value={stats.totalReps ?? NOT_ENOUGH_DATA} />
// 'Not enough data' automatically renders muted/small and announces correctly.
```

## EmptyState — standalone when you don’t need the full boundary

```tsx
<EmptyState
  title="Build a session"
  body="Create a HIIT workout to start tracking planned versus actual work."
  action={<Button label="Create workout" onPress={() => router.push('/workouts/builder')} />}
/>
```

## Toast — success, error, undo-action (announced via alert role)

```tsx
showToast('Workout saved', 'success');
showToast('Save failed — storage full. Export your data to free space.', 'error', { duration: 6000 });
showToast('Session deleted', 'info', { action: { label: 'Undo', onPress: restore } });
```

## PersistenceBanner — automatic; shown app-wide by VoltProvider

No direct usage needed. Behaviour: appears while `db.getStorageStatus()` reports failure; copy per kind (quota/unavailable/serialize/unknown); dismissible per distinct failure; re-appears if a new failure kind arrives.

Force-see it in dev:
```ts
// simulate quota failure then attempt any write
```

## Button — states including busy

```tsx
<Button label="Finish" large onPress={finish} />
<Button label="Saving…" loading onPress={finish} />     // spinner + disabled + AT busy
<Button label="Discard" variant="danger" onPress={ask} />
```

## Form primitives — labels always visible, errors inline

```tsx
<Input
  label="Exercise name"
  value={name}
  onChangeText={setName}
  error={errors.name}          // red text below field, linked contextually
  hint="Shown in your catalog"
/>
<Toggle label="Sound cues" value={sound} onChange={setSound} hint="Beeps on phase change" />
<Stepper label="Rounds" value={rounds} min={1} max={20} onChange={setRounds} suffix="rounds" />
```

## ConfirmCard (via confirmAction) — destructive flows

```tsx
const ok = await confirmAction(
  'Discard session?',
  'Recorded intervals from this run will be deleted.',
  'Discard',
  { tone: 'danger' },
);
if (!ok) return;
```

## TrendCard + LineChart — gaps stay gaps

```tsx
// trendPoints() already omits sessions without the metric — no fake zeros.
{repsTrend.length > 0 && (
  <TrendCard title="Repetitions" points={repsTrend}
    formatValue={(v) => `${Math.round(v)}`}
    accessibilityLabel="Repetition trend" />
)}
```

## RecordedCompletionCard — provenance footnote built in

```tsx
<RecordedCompletionCard
  title="This week’s recorded bars"
  footnote="Rebuilt from this week’s interval rows. Empty bars mean that input was never recorded."
  tracks={week.tracks} scoreParts={week.scoreParts} workRest={week.workRest} compact
/>
```
