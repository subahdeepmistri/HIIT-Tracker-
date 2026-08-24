# Phase 5 — UI Component System

**Status:** Shipped on the canonical set. Typecheck: **0 errors repo-wide**. Tests: **119/119**.

This phase reconciled two competing component systems into one production library and made the Phase 2.4 trust rules executable through component APIs.

---

## 1. What Changed

| Action | Detail |
|--------|--------|
| **Parked experimental library** | The eight broken dirs from an earlier session moved verbatim to `src/ui/_experimental/` (git history intact). Excluded from `tsconfig` — parked code cannot break production builds. Harvest-or-delete decision deferred to M4 as planned. |
| **Single barrel** | `src/ui/components/index.ts` exports only canonical components. No duplicate names (`Card`, `SegmentedControl` collisions gone). |
| **New: `StateBoundary`** | Explicit `ViewState<T>` = loading / empty / error / data. The trust rule "components must express state through their API, never guess" is now a type you can't avoid. |
| **New: `PersistenceBanner`** | Renders `getStorageStatus()` from Phase 4 as calm plain-language warnings (`Not saving right now — <reason>`). Wired app-wide via `VoltProvider.storageStatus`. |
| **Hardened `Toast`** | Items now announce via `accessibilityRole="alert"` + `accessibilityLiveRegion="polite"`. |
| **Hardened `Stat`** | A value of exactly `"Not enough data"` renders muted/smaller (honest emptiness, not a failed hero number) and is labelled for screen readers. |
| **Hardened `Button`** | Loading state exposed as `accessibilityState={{ busy: true }}`. |
| **Deleted dead module** | `src/engine/analytics/derived.ts` — **new finding F-11**: zero importers; stubs returned literal `'not implemented'` zeros (silent-fake-number landmine). Removed; behaviour unchanged (unreachable). |
| **Docs reset** | Stale example files describing the parked library deleted; replaced by this doc + `docs/examples/EXAMPLES.md` written against shipped reality. |

---

## 2. Component Architecture

### 2.1 Hierarchy (dependency direction: downward only)

```
Screens (app/*)                    containers: read useVolt(), own route params
  └── Features (features/*)        hybrid: domain-specific composition (SessionListRow…)
        └── ui/components          presentational: props in → pixels out
              ├── primitives.tsx   Screen Heading Label Body Strong Card Button Stat
              │                    EmptyState SegmentedControl IconButton MetricValue
              ├── StateBoundary    ★ trust-state region wrapper
              ├── PersistenceBanner★ honest storage status surface
              ├── ProgressBar      ProgressBar / Inline — ARIA progressbar w/ real values
              ├── ProgressTrack    labelled bar used by all analytics surfaces
              ├── RecordedCompletion · WorkRestSplit · PhaseBadge
              ├── StatCard/Grid · TrendCard/Sparkline · ConfirmCard
              ├── Toast            queue + container (imperative showToast API)
              ├── FormPrimitives   Input TextArea Select Toggle Stepper
              └── charts/LineChart SVG-free accessible trend chart
```

### 2.2 Presentational vs Container split — the rule that held this codebase together

| Kind | Lives in | May import | Must NOT |
|------|----------|-----------|----------|
| **Presentational** | `ui/components/*` | theme tokens, domain types/constants (`NOT_ENOUGH_DATA`) | AsyncStorage, db, controller, router, React context except `useTheme` |
| **Container/hybrid** | `features/*`, screens | presentational + engine analytics + `useVolt()` | pixel-level styling of primitives' internals |

Every file in `ui/components/` obeys this today (verified by grep: no db/controller imports). This is what made the Phase 3→5 reconciliation mechanical instead of a rewrite.

---

## 3. Props/API Design Contracts

### 3.1 The State Rule (enforced by `ViewState<T>`)

Any region that *could* load data takes its state as a prop:

```tsx
type ViewState<T> =
  | { kind: 'loading' }
  | { kind: 'empty'; title; body; action? }   // no data was ever possible
  | { kind: 'error'; message; retry? }        // data should exist but failed
  | { kind: 'data'; data: T };                // real, renderable values
```

Callers construct states from real sources (db reads are sync here, so `loading` appears around hydration/export paths; `empty` when a range/filter has zero rows; `error` from caught failures). `StateBoundary` renders each honestly — spinner+label, EmptyState copy, warn-card with retry — and announces transitions via live region.

**Prohibited pattern:** `data.length ? <List/> : null` — silent empty. Use `{kind:'empty', body:'No sessions recorded this week. Bars appear after you complete a workout.'}`.

### 3.2 Honest-value conventions baked into primitives
- `Stat`: value === `NOT_ENOUGH_DATA` → muted small text + explicit a11y label. Hero styling is reserved for real numbers.
- `ProgressBar`/`ProgressTrack`: `value: number|null` where **null means no-data**, rendered track-only at reduced opacity with `accessibilityValue {text:'Not enough data'}`; numeric values expose `{min:0,max:100,now}`. Over-plan clamps fill but adds visible caption. `showAsRecordedOnly` renders info-blue full pill labelled “Recorded · no target set” — recorded-without-target is a distinct visual state, never faked as 100% achievement.
- Colour never carries meaning alone: every variant pairs glyph/text (`⚠️`, badge labels, PhaseBadge text).

### 3.3 Composition over flags
`RecordedCompletionCard({tracks, scoreParts?, workRest?, intervals?, compact?, hideEmpty?})` composes smaller parts rather than exposing `showHeader/showWorkRest` booleans. New components follow suit: slot props over config toggles.

### 3.4 Imperative exceptions (documented, minimal)
`showToast()/hideToast()` exist because toasts fire from non-React contexts (controller callbacks, delete flows). The queue is module-level; `ToastContainer` must be mounted once at root (it is).

---

## 4. Accessibility Contract (verified per component)

| Requirement | Where satisfied |
|---|---|
| Semantic roles | Button/Card-interactive/Toggle switch/checkbox, progressbar on every bar, header on titles, alert on toasts+banner |
| Real values to AT | All progress bars expose min/max/now or explicit text state — never a coloured div |
| aria-live | toasts (polite), banner (polite), StateBoundary regions (polite) |
| Labels | IconButton requires `label`; icon-only Pressables carry accessibilityLabel (Live screen Discard ✓) |
| States | disabled/selected/checked/busy via `accessibilityState` |
| Touch targets | ≥48 (`theme.touch.min`), live controls 64, hitSlop≥8 on dense controls |
| Contrast | tokens pre-audited (04_UI_UX §6.2); accent-on-bg 13:1 |
| Keyboard/focus | web focus rings default-on (no outline:none anywhere); tab order follows DOM |

## 5. Best Practices (contributor rules)

1. **Import from the barrel** (`@/src/ui/components`). Deep imports inside `ui/components` are reserved for internal files.
2. **Never add a component that guesses state.** If it can be empty/loading/error, accept a discriminated state prop (see §3.1) or compose `StateBoundary`.
3. **Never render `0`/`—` for missing data.** Use `NOT_ENOUGH_DATA` constant so styling and a11y stay consistent.
4. **Theme tokens only.** No raw hex outside `theme/tokens.ts`.
5. **A11y is part of the definition of done** for any new interactive/progress component: role + label + state + value (where applicable), checked with screen reader before merge.
6. **Style merging:** caller `style` always last in arrays — overrides without clobbering base.
7. **Animations ≤320ms, opacity/transform only,** honour `settings.reducedMotion`; timers never animate.
8. **Parked code stays parked:** `src/ui/_experimental/` is excluded from tsconfig; do not import it. Harvest specific ideas by rewriting them canonically *with tests*.
9. One PR = one concern (refactor | finding-fix | feature), per master constraints.

## 6. Verification Performed

- `grep` proof: zero production references to `_experimental` paths.
- Full suite: 19 files, 119 tests pass (incl. 30 data-layer).
- `tsc --noEmit`: **0 errors** (was 250 before reconciliation; remaining legacy noise eliminated alongside F-11 removal).
- Screens untouched this phase → runtime behaviour unchanged except additive banner mount and toast/stat a11y attributes.
