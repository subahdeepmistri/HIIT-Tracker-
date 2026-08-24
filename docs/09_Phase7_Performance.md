# Phase 7 — Performance Report

**Method:** measure first, optimise only proven costs, re-measure identically. Harness committed as `tests/perf-report.test.ts` (writes `tests/perf-results.json`; old/new patterns timed in the same run for fairness). No speculative memoisation or virtualisation was added.

Final state: **136/136 tests · 0 type errors.**

---

## 1. Measured Wins (same machine, same run)

| Path (Progress screen pipeline @400 sessions × 24 intervals) | Before | After | Speedup |
|---|---|---|---|
| P1 performance-record join (`O(n·p)` `.some()`) → Map/Set index | 0.289 ms | 0.021 ms | **13.7×** |
| P2 analytics aggregate (per-session full interval scan) → one grouping pass + O(1) lookups | 10.84 ms | **1.17 ms** | **9.3×** |
| P3 trend charts ×7 fields (seven filter+join passes) → single-pass `trendPointSets` | 0.60 ms | **0.071 ms** | **8.4×** |

### Structural wins (verified by construction, not timers)

| Issue | Fix | Effect |
|---|---|---|
| **Live tick serialised the entire EngineState every 200 ms even when nothing changed** — late-workout payload measured at **125 KB**, i.e. ~625 KB/s of throwaway strings on a long session | Cheap structural signature (`status\|phase\|slot\|intervalCount\|reps\|distance\|pause bookkeeping\|deadlines`) checked *before* `JSON.stringify`; content compare retained as second gate | Idle ticks now cost ~0; stringify runs only on real transitions/rep edits |
| **Double persistence per mutation** — every collection mutator already wrote synchronously through the ordered queue, then ValidatedDatabase's debounce layer scheduled an identical second full-snapshot write ~2 s later | Debounce machinery deleted (`markDirty/scheduleFlush/flush`); granular notifications kept; pagehide now flushes only genuinely queued writes | Mutation bursts write once instead of twice; halved setItem volume in the common edit-then-idle pattern |

### Leak fixed

- `ToastItem` created fresh `Animated.Value`s **per render** — running animations leaked nodes and entrance fades restarted on re-render. Now stable via `useRef`.

### Audited clean (no change needed)

- ExerciseDemo frame loop: interval cleared on deps change ✓
- LiveScreen: tick interval + AppState listener removed on unmount ✓
- VoltProvider: error-check interval + all subscriptions cleaned ✓
- Toast module-level auto-dismiss timer: self-removing, no-op after manual dismiss ✓

## 2. Already Fast Enough (deliberately untouched)

- `filterSessions`: 0.007 ms — no caching warranted.
- `dashboardStats` @1000 sessions: 9.7 ms, and it recomputes only on tab focus / range switch, not per keystroke. Virtualising or memoising now would be speculative.
- `serializeEngine` when it does run: 0.12–0.14 ms — fine at transition frequency.
- React rendering: with P2 cut 9×, no screen shows render pressure; adding `React.memo` everywhere would be architecture noise without a measured culprit.

## 3. Correctness Guard During Optimisation

The indexed rewrite initially shipped a real bug the typecheck surfaced: building the interval map via `.map(row => [row.sessionId, row])` let duplicate keys overwrite, so a session would display only its **last** interval. Fixed to explicit grouping loops in both screens before commit. Lesson recorded: index-building gets a grouping loop, never a spread-map.

## 4. Scalability Recommendations (in order of actual need)

1. **~5k sessions**: snapshot approaches AsyncStorage's ~5 MB practical ceiling → add rotating archive (export-and-trim sessions older than N years) behind Settings, not automatic deletion.
2. **~10k intervals in range**: promote `dashboardStats`/aggregate into a `useMemo` keyed on `[range, revision]` if profiler ever shows >16 ms — the data layer already exposes `revision` for exactly this.
3. **History list jank at large N**: swap `.map` for virtualised `FlatList` — component work, not data work; measure first.
4. **Backend era**: `StoragePort` + `ControllerDatabase` ports mean server pagination slots in without touching these pipelines.

## 5. Reproducing

```bash
npx vitest run tests/perf-report.test.ts   # writes tests/perf-results.json
cat tests/perf-results.json
```
