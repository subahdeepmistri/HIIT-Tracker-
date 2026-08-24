# Phase 3 — Target Architecture

**Behaviour-preserving throughout.** This document defines where the code moves, what each boundary forbids, the exact order of operations, and how every step is verified to have changed nothing observable.

---

## 1. New Folder Structure

```
HITT Tracker/
├── app/                          # Expo Router screens ONLY (thin: read context, render features)
│   ├── (tabs)/                   # Tab screens — each ≤200 lines after refactor
│   ├── live/[sessionId].tsx      # Live screen — timer loop + controls
│   └── ...                       # summary/, workouts/, exercises/, onboarding/
│   # Rationale: routing concerns only; zero business logic lives here.
│
├── src/
│   ├── domain/                   # Pure types + tiny pure functions. Imports NOTHING from src/.
│   │   ├── types.ts              # Entity interfaces (unchanged)
│   │   ├── ids.ts                # Branded IDs + createId (unchanged)
│   │   ├── metrics.ts            # Metric<T> result wrapper (unchanged)
│   │   ├── units.ts              # Formatting/conversion (unchanged)
│   │   ├── date.ts               # localDateKey etc. (unchanged)
│   │   └── chart.ts              # NEW: ChartPoint shape moved OUT of ui/charts
│   │   # Rationale: the innermost ring must be importable by everything, import nothing.
│   │
│   ├── engine/                   # Pure TS logic. May import domain ONLY.
│   │   ├── workout/
│   │   │   ├── stateMachine.ts   # Immutable EngineState transitions (unchanged)
│   │   │   ├── planner.ts        # Workout+items → PlannedSlot[] (unchanged)
│   │   │   ├── liveProgress.ts   # Live-view progress math (unchanged)
│   │   │   └── plannedDuration.ts
│   │   ├── analytics/
│   │   │   ├── sessionProgress.ts
│   │   │   ├── dashboard.ts      # FIX: remove `import type { ChartPoint } from '../../ui/charts/LineChart'`
│   │   │   └── derived.ts
│   │   ├── calc/                 # metrics.ts, completion.ts, ratio.ts
│   │   ├── score/                # performanceScore.ts
│   │   ├── records/              # personalRecords.ts
│   │   ├── recovery/             # guidance.ts
│   │   └── clock/                # timestampClock.ts (Clock interface + SystemClock)
│   │   # Rationale: fully unit-testable without React Native or storage.
│   │
│   ├── data/                     # The ONLY layer touching AsyncStorage. May import domain only (+ engine TYPES for the port).
│   │   ├── storagePort.ts        # StoragePort interface (the backend-swap contract) — unchanged
│   │   ├── serialize.ts          # NEW (M1): guarded parse / safe stringify
│   │   ├── quarantine.ts         # NEW (M1): row-level validation isolation
│   │   ├── validationSchemas.ts  # Zod schemas (unchanged)
│   │   ├── schema.ts             # VoltSnapshot + DB_VERSION (unchanged)
│   │   ├── migrate.ts            # Forward migrations (unchanged)
│   │   ├── repositories/         # NEW (M2): split god-class
│   │   │   ├── exerciseRepo.ts
│   │   │   ├── workoutRepo.ts
│   │   │   ├── sessionRepo.ts
│   │   │   ├── intervalRepo.ts
│   │   │   ├── performanceRepo.ts
│   │   │   ├── recordsRepo.ts
│   │   │   ├── trainingDayRepo.ts
│   │   │   └── settingsRepo.ts
│   │   ├── database.ts           # VoltDatabase becomes composition of repos, same public API
│   │   ├── validatedDatabase.ts  # ValidatedDatabase implements StoragePort (unchanged surface)
│   │   ├── export.ts
│   │   └── deleteSession.ts
│   │   # Rationale: one choke point for persistence guarantees; repos make the snapshot manageable.
│   │
│   ├── application/              # Orchestrators. May import engine + data ports + domain.
│   │   └── workoutController.ts  # Unchanged responsibilities; deps typed against StoragePort not concrete ValidatedDatabase
│   │   # Rationale: use-case layer; the only place that knows both engine and persistence.
│   │
│   ├── features/                 # React feature components. May import anything below UI primitives.
│   │   ├── app/VoltProvider.tsx  # Context; FIX: subscribe via db.subscribe() not setInterval polling
│   │   ├── live/                 # ExerciseDemo + logic
│   │   ├── workouts/             # Builder pieces, picker, pre-workout view
│   │   ├── history/              # SessionListRow, deleteSession flow
│   │   └── onboarding/
│   │   # Rationale: composable units a screen assembles; screens stay thin.
│   │
│   ├── ui/                       # Presentation. Top of the dependency tree.
│   │   ├── components/           # CANONICAL set only (see §5 reconciliation)
│   │   │   ├── index.ts          # Single barrel export
│   │   │   └── ...               # One file per component, no duplicates
│   │   ├── charts/LineChart.tsx
│   │   ├── theme/                # ThemeProvider, tokens
│   │   ├── ConfirmProvider.tsx
│   │   └── cues.ts, navigation.ts, notifications.ts, safeBack.ts
│   │   └── _experimental/        # NEW: unadopted library pieces parked here, excluded from barrel
│   │   # Rationale: one component per name; experimentals can't break production imports.
│   │
│   ├── config/                   # defaults, density, scoreWeights (pure constants)
│   ├── pwa/                      # register, install (web-only side effects)
│   └── sync/port.ts              # Future sync contract placeholder
│
├── tests/                        # Vitest suites mirroring src structure
├── docs/                         # Phase 2 documents + findings tracker
└── scripts/, public/, assets/    # Unchanged
```

---

## 2. Clean Architecture Breakdown

### Layer Import Matrix (what each may / may not import)

| Layer | MAY import | MUST NOT import | Enforced by |
|-------|-----------|-----------------|-------------|
| **domain** | nothing outside itself | everything | convention (it has no deps today) |
| **engine** | domain, config | React, react-native, AsyncStorage, data/*, application/*, ui/* | ESLint rule + existing discipline |
| **data** | domain, config, engine **types only** (`import type { EngineState }`) | engine *logic*, application, ui, features, app/ | new ESLint rule |
| **application** | engine, data (port type), domain | react-native components, ui/*, AsyncStorage direct | new ESLint rule |
| **features** | application, engine, data (via hook), ui/components, domain | AsyncStorage direct, app/ routes | review |
| **ui** | domain, theme | engine internals beyond types, data/*, AsyncStorage | review |
| **app/** | features, ui, application (via hook), engine (types/formatting helpers) | AsyncStorage, data/* direct | review |

### Where the Boundaries Sit

1. **Engine ↔ Data**: The engine computes; it never persists. `stateMachine.tick()` returns a new `EngineState`; the controller decides to save it. Today this already holds — we codify it.
2. **Data ↔ Everything**: `StoragePort` is the single persistence interface. Feature/engine code never sees `AsyncStorage`. Already true structurally; M1 makes it true behaviourally (safe serialise, quarantine).
3. **Application ↔ UI**: Screens consume `useVolt()` which exposes `controller` + `db`. Screens never construct controllers or call `AsyncStorage`.
4. **Domain ↔ Chart shapes**: `dashboard.ts` currently imports `ChartPoint` from `src/ui/charts/LineChart.tsx` — an engine→UI violation. Fix: move the shape to `domain/chart.ts`; both engine and chart import from there.

---

## 3. Refactoring Strategy — Order of Operations

Each step = one commit. Verification gate before the next step: `npm run typecheck && npm test && manual smoke (Home → Progress → start workout → skip ×3 → Finish → Summary)` plus screenshot comparison of the four main screens against baseline.

| Step | Action | Findings addressed | Risk | Rollback |
|------|--------|--------------------|------|----------|
| R1 | Add `domain/chart.ts`; re-point `dashboard.ts` and `LineChart.tsx` imports at it | F-09 | trivial | revert commit |
| R2 | Introduce `data/serialize.ts`; replace bare `JSON.parse` in `database.init()` and `validatedDatabase.loadLiveSession()` with guarded parse (identical fallback semantics) | F-06 | low | revert commit |
| R3 | Introduce `data/quarantine.ts`; change snapshot load to per-row Zod validation, quarantining bad rows instead of whole-parse failure | F-03 | medium — changes corrupt-data path | keep behind flag one release |
| R4 | Atomic write path in `VoltDatabase.save()` (in-flight guard + trailing flush; temp-key swap on web) + background/unload flush hooks | F-04 | medium | revert commit |
| R5 | Typed storage-error classification + honest failure surfacing (`lastSaveError` kinds → provider banner/toast) | F-05 | low | revert commit |
| R6 | Fix cross-tab reload: storage event applies incoming JSON into live instance instead of calling `init()` (which no-ops when ready) | F-02 | medium | revert commit |
| R7 | Split `VoltDatabase` into `repositories/*`; `database.ts` composes them preserving the exact public API (`db.sessions.upsert(...)` etc.) | F-10 | high surface area, low logic risk | revert commit |
| R8 | Type `WorkoutControllerDeps.db` against `StoragePort`; delete `as any` in VoltProvider | F-09 | low | revert commit |
| R9 | Component-set reconciliation (§5): park experimental duplicates under `_experimental/`, single barrel | F-10 | low | git mv back |
| R10 | Delete dead exports surfaced by barrel consolidation | F-10 | trivial | revert commit |

**Rules during execution**
- No behaviour change unless a numbered finding names it. R2/R3/R6 are finding-driven behaviour fixes executed here because they are inseparable from the structural move — flagged explicitly per the constraint-resolution rule ("a fix that requires changing an existing flow is a defect fix").
- Everything else is byte-identical observable output.
- Keep the app runnable at every commit; CI green between steps.

---

## 4. What Specifically Gets Better

| Improvement | Before | After | How you'd notice |
|---|---|---|---|
| **Corrupt data resilience** | One malformed interval row → whole snapshot replaced with empty seed (silent history loss) | Bad rows quarantined; valid history loads; repair UI lists what was skipped | Corrupt a row by hand → app still shows your sessions |
| **Kill-mid-write safety** | `setItem` interrupted → potentially truncated JSON → full reset next launch | Guarded parse + atomic pattern → last good snapshot survives | Kill tab repeatedly during save → history intact |
| **Cross-tab truth** | Second tab's edits could clobber first (reload no-op bug) | Both tabs converge on same snapshot within ~1s | Two tabs, add session in A → visible in B |
| **Storage honesty** | Save failures invisible (1s polling race) | Typed failures banner immediately | Fill storage → explicit "not saving" banner, not silent loss |
| **Layer hygiene** | Engine imports UI type; controller takes concrete class | Domain owns shapes; controller programs to port | `grep "from '../../ui"` in engine → empty |
| **Maintainability** | 409-line database god-class | 8 focused repos behind unchanged API | Touching training-days logic = editing one small file |
| **Component clarity** | Two `Card`s, two `SegmentedControl`s, ambiguous barrel | One canonical set + parked experiments | IDE autocomplete shows no duplicate names |

Nothing user-visible changes except where a Phase-1 finding named the defect.

---

## 5. Component Set Reconciliation (detail)

Phase 0 found two coexisting component systems:

- **Canonical (screen-used)**: `ui/components/primitives.tsx`, `ProgressBar.tsx`, `StatCard.tsx`, `Toast.tsx`, `FormPrimitives.tsx`, `RecordedCompletion.tsx`, `ProgressTrack.tsx`, `WorkRestSplit.tsx`, `PhaseBadge.tsx`, `TrendCard.tsx`, `ConfirmCard.tsx`
- **Experimental (built in earlier phase, partially broken types)**: `ui/components/{primitives,forms,feedback,display,navigation,overlays,charts,layout}/`

Decision: **park experimentals**, don't delete. They contain good API ideas (compound Card, trust-state ProgressBar variants) worth harvesting later, but they fail typecheck and would destabilise the barrel. Move to `ui/_experimental/`, exclude from `index.ts`, note their fate in docs. Harvest into canonical files opportunistically in M4 with tests.

---

## 6. Explicitly Rejected Alternatives

- **Redux/Zustand for state** — snapshot-in-context is already a working store; adding a library adds indirection without removing any coupling. Rejected: simpler option chosen.
- **Splitting EngineState persistence per-slot** — finer-grained keys would reduce write size but multiply corruption surfaces and migration complexity for a <5MB dataset. Rejected: single-key atomicity is easier to prove correct.
- **Full virtualisation of History now** — measured threshold not hit at realistic scale (<1000 sessions). Deferred to M6 measurement-first pass.
- **Rewriting screens onto experimental components** — screens are correct and tested against canonical set; rewrite risk buys aesthetics already achievable. Rejected: harvest, don't migrate.