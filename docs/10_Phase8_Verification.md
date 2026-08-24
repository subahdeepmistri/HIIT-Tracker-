# Phase 8 — Verification Report

**Verdict: the original complaint is fixed, with evidence.** Every displayed value now traces through the Phase 4 persistence layer to stored rows, and every Phase 1 edge case has a named test or an honest deferral note.

Final state: **22 test files · 143 tests passing · 0 TypeScript errors repo-wide.**

---

## 1. Render-Path Walk — displayed value vs real data

Method: `tests/verification.test.ts` drives one full workout through the **real controller** (`start → live ticks → reps on every work slot → auto-finalize`), persists via the production code paths, then computes each UI row twice — once through the exact chain a screen uses, once from independent arithmetic on planner constants / stored rows. All rows match.

| Phase 0 row | Displayed chain | Independent math | Match |
|---|---|---|---|
| Live · interval bar | `getLiveView().intervalProgress` @half of 60 s slot | elapsed/planned = 30/60 | ✅ (`toBeCloseTo 0.5`) |
| Live · interval detail | `intervalDetail` | `"30s / 60s"` | ✅ exact |
| Live · workout bar | `(closedSlots + inSlot) / totalSlots` | `(6+0.5)/11` | ✅ |
| Live · rounds bar/detail | `roundProgress`, `roundDetail` | `0.5`, `"1 / 2"` | ✅ |
| Live · reps bar/detail | `repsProgress`, `repsDetail` | `15/15 = 1`, `"15 / 15"` | ✅ |
| Live · timer | `remainingMs` | deterministic ms count | ✅ exact (`29 999`, harness enters slots 1 ms in) |
| Summary · duration/active/rest | stored perf record fields | 460 / 360 / 100 s from slot sums | ✅ |
| Summary · completion % | `workCompletionPercent` | actual/planned = 360/360 | ✅ 100% |
| History/Home row fill & subtitle | `perf.workCompletionPercent / 100`, compact-duration format | same stored record | ✅ |
| Home · week sessions/active/training | `weekStats` | 1 / 360 s / 460 s | ✅ |
| Progress · stat grid | `dashboardStats` incl. streak ≥ 1 (session today) | counts from filtered records | ✅ |
| Progress · NO_DATA honesty | distance track `value:null`, detail `"Not enough data"` | never tracked ⇒ absent input stays empty | ✅ (never `0%`) |
| Progress · per-interval tracks | `snap.intervals[i].tracks` vs stored interval ratios | 6/6 rows equal stored outcome+ratio | ✅ |
| Progress · trends | `trendPoints('duration')` | single point = stored 460 s | ✅ (suite-level; perf harness covers scale) |
| Personal records list | earned PRs reference this session; values equal stored fields (active-time, rounds, completion) | per-kind switch assertions | ✅ |
| Delete cascade | `applySessionDelete` output | 0 sessions / 0 intervals / 0 perf rows remain | ✅ |

## 2. Edge-Case Matrix (Phase 1 set)

| Case | Evidence | Result |
|---|---|---|
| Empty storage | data-layer: fresh seeds catalog+starters, persisted, `source:'fresh'` | ✅ |
| Corrupt storage | init-corrupt test: clean start, original bytes at `corrupt-backup` | ✅ |
| Old-version data | v1→v2 migration + pre-migration backup asserted | ✅ |
| Future version | v99 loads intact, never downgraded | ✅ |
| Quota exceeded | classification → `kind:'quota'`; banner copy path | ✅ |
| Storage unavailable | **new integration**: throwing KV boots usable in-memory store, failure classified for PersistenceBanner | ✅ |
| Two tabs concurrent | reloadFromStorage suite (apply/ignore/mirror-clear/no-echo/single-echo) | ✅ |
| Refresh mid-write | ordered write queue test + safeParse recovery of truncated JSON (= corrupt path); true byte-teardown not reproducible in JS — see §6 | ✅ (bounded claim) |
| Midnight rollover | **new**: 23:59:59.999 vs 00:00:00.500 land on own local days; streak spans both; TZ-safe construction | ✅ |
| Large dataset | perf harness: dashboard/analytics correct at 400–1000 sessions | ✅ |
| Bad row isolation | quarantine suite: siblings survive, entry persisted | ✅ |
| NaN/∞ hostility | guards suite: 13 cases, no NaN reaches any display value | ✅ |

## 3. Definition of Done — item by item (docs/05 §4)

1. **Data truth** — render-path walk above + guards suite. ✅
2. **Findings** — F-01…F-12 all CLOSED with named tests/greps (`docs/findings.md`). New F-13 recorded below as *observed-correct*, not a defect. ✅
3. **Edge cases** — matrix §2. ✅
4. **Persistence guarantees** — versioning ✓ validation read+write ✓ ordered atomic writes ✓ quota messaging ✓ cross-tab ✓ export/import round-trip ✓ (data-layer suite). ✅
5. **Live integrity** — kill/reopen restore covered by live-runtime suite (hydrate + tick catch-up; persistence-hang and throw-isolation cases). ✅
6. **Honesty contract** — four-state rule executable via `ViewState<T>`; Stat/ProgressBar NO_DATA styling; PersistenceBanner live. Verified in component suites + verification walk. ✅
7. **Accessibility** — see §5. ✅ with two fixes applied during this phase.
8. **Performance** — Phase 7 report: 8–14× pipeline wins, tick/write waste eliminated, leak fixed. ✅
9. **Stability** — suite green; typecheck 0; every phase landed runnable. ✅
10. **Docs** — docs/00–09 + findings ledger current; README index updated. ✅

## 4. Complete List of Behaviour Changes (all finding-traced)

Approved defect fixes only:
1. Cross-tab updates now propagate (F-02).
2. One bad row no longer erases history; corrupt bytes preserved (F-03/F-06).
3. Saves are ordered; web close flushes pending writes (F-04).
4. Storage failures surface typed, visible warnings (F-05).
5. Non-finite values are refused at serialization instead of written as nulls (F-07 support).
6. Dead misleading code removed: `derived.ts` stubs, `stateMachine.finish()` (F-11/F-12) — unreachable, zero behaviour change.
7. Additive UX from approved phases: PersistenceBanner, StateBoundary states, Toast announcements, Stat/ProgressDots honest AT values.
8. Performance refactors: mathematically identical outputs, faster paths (Phase 7 tables).

Everything else — flows, screens, schemas, seed data — is unchanged.

## 5. Accessibility Pass

Static audit across shipped components/screens (no RN runtime in CI here; runtime SR passes are listed in §6):

- **7 progressbar sites** now all expose `accessibilityValue` — gap found and fixed this phase: onboarding `ProgressDots` (added `min/max/now`). Others already exposed real `now` or explicit text ("Not enough data").
- **6 alert/live-region sites** (toasts, banner, StateBoundary regions).
- Interactive elements carry role/state; icon-only controls labelled (spot-audit of Live screen controls ✓).
- Colour-token fix from audit: form error borders now use themed `danger` (was fixed `#EF4444`, wrong in light theme). Remaining raw hexes are intentional contrast ink pairs inside badge colour maps — logged as token-debt, not user-facing defects.
- Known accepted limitation: web focus ring relies on framework defaults (no `outline:none` anywhere — verified).

## 6. Residual Risks / Honestly Unverified

1. **Manual device passes not runnable in this environment**: real screen-reader walkthrough (VoiceOver/TalkBack), and responsive screenshots at 320/768/1440. Checklist provided below; ~20 min to execute.
2. True mid-byte storage truncation isn't simulatable from JS; coverage is the corrupt-recovery path plus ordered-write guarantees. Risk assessed low (platform `setItem` is key-atomic).
3. `ValidatedDatabase.validateLoadedSnapshot()` is defence-in-depth logging only — redundant post-quarantine, left intentionally (M4 candidate).
4. Provider still polls save-status at 1 Hz rather than event-driven — negligible cost, noted in findings "observed" list.
5. Experimental library sits parked under `src/ui/_experimental/` excluded from builds — decide harvest-vs-delete at M4.
6. **F-13 (recorded, correct-by-design)**: leaving a REPS slot untouched stores `actualReps: 0`, which honestly lowers rep-completion. This is the recorded-only contract working; if "never logged ≠ logged zero" distinction is ever wanted, it's a schema addition (`actualReps: undefined` when untouched), not a bug fix.

### Manual checklist (execute on device)
- [ ] VoiceOver/TalkBack: complete one workout — hear phase changes, toasts once, bars announce %
- [ ] 320 px: Live hero timer scales; stat grids wrap 2-up
- [ ] 768/1440 px (web): content column centers; grids 3–4-up; tab rail top
- [ ] Kill tab mid-workout → reopen → Resume restores remaining seconds exactly
- [ ] Fill quota (DevTools loop `localStorage.setItem`) → edit → banner appears; export clears it

## 7. Final Numbers

```
npx vitest run        → 22 files, 143 tests passed
npm run typecheck     → 0 errors
Layer audits          → engine→ui: clean · ui/features→storage: clean
Perf                  → docs/09 tables (8–14× hot-path wins)
```

The system's output and its interface now agree — and both are provably anchored to the user's stored rows.
