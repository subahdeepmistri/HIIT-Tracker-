# Findings Ledger

Every Phase 1 finding, plus mid-implementation discoveries (F-11, F-12). Status is CLOSED only with named evidence. Behaviour changes are permitted only against these numbers.

| ID | Finding (root cause) | Severity | Fix | Status & Evidence |
|----|----------------------|----------|-----|-------------------|
| **F-01** | Old-version snapshots could be mangled or discarded by future migrations | Critical | Pre-migration byte backup (`db:pre-migration-backup`); forward-only `applyMigrations`; unknown future versions preserved as-is | ✅ CLOSED — `tests/data-layer.test.ts`: v1→v2 recomputes durations + backup written; v99 loads intact |
| **F-02** | Cross-tab updates dead: storage handler called `init()` which early-returns on ready flag; provider had a second duplicate listener also calling `init()` | High | `VoltDatabase.reloadFromStorage()` applies external writes (no-echo when identical); provider listener deleted, replaced by single `db.subscribe` reaction | ✅ CLOSED — reload tests: apply / ignore-corrupt / mirror-clear / no-echo / single-echo-on-migration |
| **F-03** | One malformed row destroyed entire history (whole-snapshot parse → empty seed) | Critical | Row-level Zod validation per collection; bad rows quarantined to `@hiit-tracker/quarantine` (cap 200); good rows load | ✅ CLOSED — quarantine init test: sibling sessions+intervals survive, integrity valid, entry persisted |
| **F-04** | Concurrent saves could interleave/reorder (`await setItem` races); web tab-close lost pending debounce | High | Single-flight ordered write queue + `flushWrites()`; `pagehide`/`visibilitychange` flush in ValidatedDatabase | ✅ CLOSED — 3-concurrent-upserts ordering test; flush hooks wired |
| **F-05** | Storage failures swallowed or mislabelled; user never told saves weren't landing | High | `classifyStorageError` → quota/unavailable/serialize/unknown; `getStorageStatus()`; `PersistenceBanner` mounted app-wide via `VoltProvider.storageStatus` | ✅ CLOSED — quota classification test; banner renders per-kind copy, dismissible per distinct failure |
| **F-06** | Corrupt JSON silently replaced everything with fresh seed (data loss disguised) | Critical | `safeParse` guard; corrupt bytes preserved at `db:corrupt-backup`; clean start reported as `source:'corrupt'` | ✅ CLOSED — init-corrupt test asserts backup bytes retained |
| **F-07** | NaN/Infinity could reach arithmetic feeding displayed values | High | Guards already centralised (`completionPercent`, `workRestRatio`, `clamp01`, `meanOf`) + writes now reject non-finite at serialization boundary | ✅ CLOSED — `tests/guards.test.ts`: 13 hostile-input cases across calc/live/dashboard/getLiveView |
| **F-08** | Division-by-zero paths (0 planned, 0 rounds, 0 rest) could emit Infinity/NaN text | High | Same guard layer returns explicit insufficient states ("Not enough data", "Continuous" for rest=0&work>0) | ✅ CLOSED — guards.test.ts zero-plan/zero-rounds/zero-rest cases |
| **F-09** | Layer violation: engine imported UI type (`dashboard.ts` ← `ui/charts/LineChart`) | Medium | `domain/chart.ts` owns `ChartPoint`; LineChart re-exports for compat; engine imports domain only | ✅ CLOSED — `grep 'from .*ui/' src/engine` → zero hits |
| **F-10** | Maintainability: 409-line database god-class mixing orchestration with 9 collections' CRUD | Medium | Split into `src/data/repositories/*` behind byte-identical public API; class keeps lifecycle only | ✅ CLOSED — typecheck 0, 119 tests green post-split, no caller changes |
| **F-11** | *(found Phase 5)* Dead `engine/analytics/derived.ts`: zero importers, stubs returning literal fake zeros, duplicate keys | Medium | Deleted (git history retains) | ✅ CLOSED — grep zero refs pre-delete |
| **F-12** | *(found Phase 6)* Dead `stateMachine.finish()` with always-true ternary implying a complete/partial distinction that doesn't exist; controller uses completeNow/savePartial exclusively | Low | Removed along with single-use `allWorkComplete` helper; comment marks why | ✅ CLOSED — grep zero call sites pre-delete; suite green |

## Observed, deliberately not changed

- `ValidatedDatabase.validateLoadedSnapshot()` warns on whole-snapshot Zod failure but doesn't act — redundant since `VoltDatabase.init` now row-validates before assignment. Left as defence-in-depth log; removal candidate for M4.
- Provider still polls `getLastSaveError()` at 1 Hz for banner status. Event-driven refactor possible but adds subscription surface for marginal gain at current scale.

## Verification index

- Data layer: `tests/data-layer.test.ts` (30)
- Display-value guards: `tests/guards.test.ts` (13)
- Full suite: 19 files, 132 tests — `npx vitest run`
- Typecheck: `npm run typecheck` → 0 errors
