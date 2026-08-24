# Development Plan — HIIT Tracker

## 1. Guiding Sequence

**Data integrity before presentation. A beautiful bar over broken data is still broken.**

Every milestone below leaves the app in a working, runnable state. No step depends on unfinished work from a later step. Refactors, bug fixes, and features are separate workstreams — never mixed in one change.

---

## 2. Milestones

### M0 — Project Setup (0.5 day)
- Verify toolchain: `npm run typecheck`, `npm test`, `npm run build` all green
- Establish baseline: current app runs; record cold-start time + snapshot size
- Create `docs/findings.md` tracking sheet for Phase 1 findings F-01…F-10 status
- **Exit**: green pipeline, baseline metrics recorded

### M1 — Data Layer Hardening (Phase 4) · Priority: P0 · ~3 days
The most important code in the app. Everything the user trusts rests on it.

1. **Safe serialisation module** (`src/data/serialize.ts`)
   - Guarded `JSON.parse` returning `Result<T>` instead of throwing
   - Pre-write sanitiser rejecting NaN/Infinity/undefined/circulars before stringify
   - *Addresses: F-06 (corrupt JSON handling)*

2. **Row-level validation & quarantine** (`src/data/quarantine.ts`)
   - Per-row Zod parse of every collection on load
   - Bad rows → quarantine store (key `@hiit-tracker/quarantine`), valid rows load
   - Surfaced via `db.getQuarantinedRows()` + Settings repair UI
   - *Addresses: F-03 (one bad row kills whole history)*

3. **Atomic debounced writes**
   - Write-to-temp-key → verify → swap pattern (or single setItem with in-flight guard)
   - `beforeunload`/AppState background flush hook
   - *Addresses: F-04 (half-written state on kill mid-write)*

4. **Quota/unavailable degradation**
   - Typed error classification: quota vs security vs unknown
   - User-facing messages per Phase 2.4 trust rules; persistent banner when persist fails
   - *Addresses: F-05*

5. **Cross-tab write safety**
   - Storage-event listener reloads snapshot into existing VoltDatabase instance (currently calls `init()` which early-returns)
   - Last-write-wins at key level documented; per-collection merge deferred to backend era
   - *Addresses: F-02*

6. **Derived-value guards**
   - Central clamp/safe-divide helpers already exist (`completionPercent`) — audit ALL call sites
   - Live-view slot math clamped; NaN can never reach DOM
   - *Addresses: F-07, F-08*

7. **Migration tests**: v1→current fixture round-trips; unknown-version quarantine path
   - *Addresses: F-01 residual risk*

**Exit criteria**: corrupt-data and migration test suites pass; two-tab manual test passes; kill-mid-session restores exactly; quota simulation shows honest banner.

---

### M2 — Architecture Refactor (Phases 3+6.1) · Priority: P1 · ~2 days
Execute target structure (Phase 3 doc) as pure moves — behaviour-preserving, verified per-step:

1. Extract `src/engine/analytics/*` imports away from `ui/charts/LineChart` types (engine must not import UI — currently violated by `dashboard.ts:5`)
2. Move `ChartPoint` type to domain or duplicate minimal shape in engine
3. Split `VoltDatabase` god-class into collection repositories behind unchanged public API
4. Consolidate the two competing completion paths behind one `ProgressMath` facade where behaviour is identical; document the intentional live-vs-final difference otherwise
5. Delete dead code found in Phase 0 (unused exports in components barrel)

**Verification per step**: typecheck + full test suite + side-by-side render of Home/Progress/Live/Summary against pre-refactor screenshots.

*Addresses: F-09 (layer violations), F-10 (maintainability)*

**Exit**: architecture matches Phase 3 tree; zero observable behaviour change.

---

### M3 — Findings Fixes (Phase 6.2) · Priority: P0 · ~2 days
Work remaining findings in severity order, one commit per finding:

- Each fix references its finding number in commit message
- Manual verification steps written in findings.md as we go
- Behaviour changes ONLY where Phase 1 named the defect and user approved

**Exit**: all findings closed or explicitly deferred with reasons.

---

### M4 — Component System Polish (Phase 5 deliverable integration) · Priority: P1 · ~2 days
- Reconcile the experimental component library (`ui/components/primitives|forms|feedback|display|navigation|overlays`) with the battle-tested originals actually used by screens
- Either promote proven pieces or archive experimentals behind `_experimental/` until adopted
- Single barrel export; no duplicate component names (currently `Card`, `Screen`, `SegmentedControl` collide)
- Accessibility pass on the canonical set (already strong — verify each)

**Exit**: one component per name; screens import from one barrel; docs match reality.

---

### M5 — Approved Features (Phase 6.3) · Priority: P2 · ~3 days
Only features approved in Phase 2.1 PRD review. Candidates requiring explicit sign-off:
- None blocking MVP. PRD out-of-scope list stands.

**Exit**: n/a if none approved.

---

### M6 — Performance Pass (Phase 7) · Priority: P2 · ~1–2 days
- Measure first: React DevTools profiler on Progress with 100 synthetic sessions
- Optimise only measured hot paths (likely candidates: `aggregateSessionProgress` recomputation per render; `intervals.listBySession` O(n) scans inside loops → index Map)
- Memoise dashboard derivations keyed on revision
- Memory-leak sweep: interval/listener cleanup audit (live screen tick, storage listeners)

**Exit**: before/after numbers recorded; no accuracy traded for speed.

---

### M7 — Verification (Phase 8) · Priority: P0 · ~1 day
- Walk every Phase 0 render-path row → confirm equals stored-data math
- Re-run every Phase 1 edge case explicitly (empty, corrupt, old version, quota, disabled storage, two tabs, mid-write kill, midnight, large dataset)
- DoD checklist item-by-item (§4)
- Accessibility + responsive passes (320/768/1440)
- Residual-risk statement

**Exit**: verification report delivered.

---

## 3. Dependencies

```
M0 ──► M1 ──► M2 ──► M3 ──► M6 ──► M7
              │
              └──► M4 ──┘ (parallel-safe after M2)
M5 only after M3, inserted before M6
```

M1 is the critical path — nothing else proceeds until persistence is hardened.

## 4. Definition of Done (MVP)

A release ships when ALL of the following hold:

1. **Data truth**: Every value in the Phase 0 render-path map traces through the Phase 4 layer and equals its stored-data computation. Spot-checked on 10 sessions.
2. **Findings**: F-01…F-10 closed, or deferred with written rationale approved by owner.
3. **Edge cases**: The 12-case edge matrix (SRS §4) passes manual verification.
4. **Persistence guarantees**: versioned schema ✓ validation-on-read/write ✓ atomic writes ✓ quota messaging ✓ cross-tab sync ✓ export/import round-trip ✓.
5. **Live integrity**: kill/reopen restores exact timer state; pause/resume preserves remaining time to the second.
6. **Honesty contract**: zero/empty/failed/loading states never conflated (UI/UX §5); no fake progress anywhere.
7. **Accessibility**: progressbars expose real values; contrast AA; keyboard-operable web; focus visible; no colour-only state.
8. **Performance**: TTI < 2s; live tick < 16ms; dashboard < 100ms @100 sessions; no retained listeners after unmount.
9. **Stability**: full test suite green; typecheck clean; app runnable at every commit in history.
10. **Docs**: ARCHITECTURE/BEST_PRACTICES reflect shipped reality; README quick-start accurate.

## 5. Risk Register (Implementation)

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Refactor breaks subtle behaviour | Med | High | Screenshot diffing + full test suite per step; tiny commits |
| Migration bug loses user data | Low | Critical | Fixture round-trip tests; backup-before-migrate (copy raw key to `*-backup`) |
| Quota handling regresses | Low | High | Simulated quota tests in CI |
| Scope creep into backend territory | Med | Med | Constraint #1 re-read before any design discussion |

## 6. Out of Plan (Explicitly Deferred)

Backend sync, auth, HR sensors, scheduling, health-platform integrations — see PRD §5. Any request during implementation gets added to a parking lot doc, not the sprint.