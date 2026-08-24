# System Architecture — HIIT Tracker

## 1. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Runtime** | React Native 0.76 + Expo SDK 51 | Write once, run iOS/Android/Web; managed workflow; OTA updates |
| **Language** | TypeScript (strict) | Catch data-shape bugs at compile time; branded IDs prevent mixups |
| **State** | In-memory snapshot + React Context (`VoltProvider`) | Single source of truth; no Redux/Zustand overhead |
| **Persistence** | `@react-native-async-storage/async-storage` (localStorage on web) | Expo-managed, async, works on all platforms |
| **Validation** | Zod 3.23 | Runtime schema validation at persistence boundary |
| **Navigation** | Expo Router (file-based) | Type-safe routes, deep linking, web support |
| **UI Primitives** | Custom component library (`src/ui/components/*`) | Full control over accessibility, theming, bundle size |
| **Theming** | CSS-in-JS tokens (`src/ui/theme/tokens.ts`) + `ThemeProvider` | Design tokens as source of truth; dark/light/system |
| **Charts** | Custom SVG-like View primitives (`LineChart`, `Sparkline`) | No heavy deps; 60fps on low-end; accessible |
| **Testing** | Vitest (unit) + Expo test utils | Fast, TypeScript-native, runs in CI |
| **Build** | EAS Build / `expo export` | Production binaries + static web export |

**Explicitly Rejected:**
- Redux/Zustand/MobX — Context + immutable snapshot is simpler and sufficient
- React Query / SWR — No server; local data is synchronous
- NativeWind / Tailwind — Custom tokens give tighter control; no JIT needed
- Reanimated 3 / Skia — Not needed for timer UI; `setInterval` + `useState` is 60fps
- SQLite / WatermelonDB — Overkill for < 5 MB; AsyncStorage is simpler and portable

---

## 2. System Components (Clean Architecture Layers)

```
┌─────────────────────────────────────────────────────────────┐
│                      UI LAYER (React)                        │
│  Screens → Feature Components → Shared UI Components         │
│  (app/*)      (features/*)        (ui/components/*)          │
└──────────────────────────┬──────────────────────────────────┘
                           │ imports only downward
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                          │
│  WorkoutController (orchestrates live session + finalize)    │
│  useVolt() context (provides db, controller, settings)       │
└──────────────────────────┬──────────────────────────────────┘
                           │ imports only downward
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     ENGINE LAYER (Pure TS)                   │
│  stateMachine, liveProgress, planner,                        │
│  sessionProgress, dashboard, metrics, score, records        │
│  (src/engine/*)                                              │
│  ─────────────────────────────────────────────────           │
│  NO React, NO AsyncStorage, NO platform APIs                │
└──────────────────────────┬──────────────────────────────────┘
                           │ imports only downward
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     DATA LAYER                               │
│  ValidatedDatabase (implements StoragePort)                 │
│  VoltDatabase (raw AsyncStorage)                            │
│  validationSchemas (Zod), migrate, export, deleteSession    │
│  (src/data/*)                                                │
└──────────────────────────┬──────────────────────────────────┘
                           │ imports only downward
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     DOMAIN LAYER                             │
│  types, ids, metrics, units, date, validation               │
│  (src/domain/*)                                              │
│  ─────────────────────────────────────────────────           │
│  Pure types + tiny pure functions                            │
└─────────────────────────────────────────────────────────────┘
```

### Import Rules (Enforced by ESLint `no-restricted-imports`)

| Layer | May Import From | Must NOT Import From |
|-------|-----------------|----------------------|
| UI | Features, Engine, Data, Domain | (nothing lower) |
| Application | Engine, Data, Domain | UI, Features |
| Engine | Domain | Application, UI, Features, Data |
| Data | Domain | Engine, Application, UI, Features |
| Domain | (nothing) | All other layers |

**Why this matters**: Engine = pure logic, testable without React Native. Data = only place touching AsyncStorage. UI = only place with React components.

---

## 3. Data Flow (Detailed)

### 3.1 Live Session Write Path

```
User taps "Start" on WorkoutScreen
       │
       ▼
WorkoutController.start(plan, countdown, reducedMotion)
       │
       ├── planWorkout(workout, items, countdown) → PlannedWorkout (Engine)
       ├── startWorkout(planned, now) → EngineState (Engine)
       ├── VoltDatabase.sessions.upsert(session: IN_PROGRESS) (Data)
       │
       ▼
Controller.state = EngineState
       │
       ▼
LiveScreen: 1s interval → controller.tick()
       │
       ├── tick(state, now) → new EngineState (Engine)
       ├── getLiveView(state, now) → LiveView (Engine)
       │
       ▼
Controller.schedulePersist() → debounced 2s
       │
       ├── persistLiveOnly():
       │    serializeEngine(state) → JSON
       │    ValidatedDatabase.saveLiveSession(json) (Data)
       │         │
       │         ├── validateEngineState(json) → Zod
       │         ├── AsyncStorage.setItem(LIVE_KEY, json)
       │         └── notify liveListeners (cross-tab)
       │
       └── flushIntervals() (every tick, notify=false):
            intervals.replaceSession(sessionId, drafts) (Data)
```

### 3.2 Session Finalize Path

```
User taps "Finish" / "Save Partial" / auto-complete
       │
       ▼
WorkoutController.finalize('COMPLETED' | 'PARTIAL')
       │
       ├── flushIntervals() → intervals.replaceSession() (Data)
       ├── calculateSessionMetrics(session, intervals, endedAt) → SessionMetrics (Engine)
       ├── scoreFromMetrics(metrics, plannedRounds) → PerformanceScoreResult (Engine)
       │
       ├── PerformanceRecord upsert (Data)
       ├── Session upsert (status=COMPLETED/PARTIAL) (Data)
       ├── trainingDays.syncFromSessions() (Data)
       │
       ├── detectPersonalRecords() → PersonalRecord[] (Engine)
       │    └── records.replaceAll() (Data)
       │
       └── persistLive(null) → clears LIVE_KEY (Data)
```

### 3.3 Read Path (Progress Dashboard)

```
ProgressScreen mounts
       │
       ▼
useVolt() → db (ValidatedDatabase)
       │
       ├── db.sessions.list() → WorkoutSession[]
       ├── db.performance.list() → PerformanceRecord[]
       ├── db.intervals.listBySession(id) → IntervalSession[]
       │
       ▼
filterSessions(sessions, range, now) → WorkoutSession[]
       │
       ▼
dashboardStats(sessions, performance, now) → DashboardStats (Engine)
       │
       ├── sum/mean over performance records
       ├── currentStreak(completed, now) (Engine)
       │
       ▼
buildSessionProgress(session, intervals, now) → SessionProgressSnapshot (Engine)
       │
       ▼
aggregateSessionProgress(snapshots) → AggregatedProgress (Engine)
       │
       ▼
RecordedCompletionCard / StatCard / TrendCard / LineChart (UI)
```

---

## 4. Storage Architecture

### 4.1 Keys

| Key | Value | Schema | Writer | Reader |
|-----|-------|--------|--------|--------|
| `@hiit-tracker/snapshot` | `VoltSnapshot` (versioned) | `VoltSnapshotSchema` | `VoltDatabase.save()` | `VoltDatabase.init()`, `ValidatedDatabase.loadSnapshot()` |
| `@hiit-tracker/live-session` | `EngineState` | `EngineStateSchema` | `WorkoutController.persistLive()` | `VoltProvider.hydrateFromStorage()`, `ValidatedDatabase.loadLiveSession()` |
| `@hiit-tracker/legacy-snapshot` | v1 snapshot | Same | Migration only | `VoltDatabase.init()` fallback |
| `@hiit-tracker/legacy-live` | v1 live state | Same | Migration only | `ValidatedDatabase.loadLiveSession()` fallback |

### 4.2 Snapshot Structure (`VoltSnapshot`)

```typescript
interface VoltSnapshot {
  version: number;                    // DB_VERSION (current: 3)
  user: User;
  settings: UserSettings;
  exercises: Exercise[];
  workouts: Workout[];
  workoutExercises: WorkoutExercise[];
  sessions: WorkoutSession[];
  intervals: IntervalSession[];
  performanceRecords: PerformanceRecord[];
  personalRecords: PersonalRecord[];
  trainingDays: TrainingDay[];
}
```

### 4.3 Migration Strategy

- **Versioned**: `DB_VERSION` in `schema.ts` increments on breaking schema change
- **Forward-only**: `applyMigrations(snapshot)` runs on every `init()`
- **Never discard**: Unknown fields preserved; missing fields get defaults
- **Quarantine**: `ValidatedDatabase` isolates rows failing Zod validation; `repair()` removes orphans

### 4.4 Cross-Tab Sync

```
Tab A: ValidatedDatabase.save() → AsyncStorage.setItem(KEY, json)
       │
       ▼
Browser fires `storage` event on Tab B
       │
       ▼
VoltProvider.handleStorage(event) → db.init() → re-read snapshot
       │
       ▼
setRevision(v+1) → React re-renders with fresh data
```

**Latency**: < 2s (debounce + event propagation). Acceptable for personal use.

### 4.5 Quota & Unavailable Handling

| Scenario | Handling |
|----------|----------|
| `QuotaExceededError` | Catch in `save()` → `lastSaveError` → toast "Storage full — export data to free space" |
| `SecurityError` (private browsing) | Catch → in-memory mode (no persist) → toast "Changes won't save in private mode" |
| Corrupt JSON | `JSON.parse` try/catch → `emptySnapshot()` → toast "Corrupt data — started fresh" |
| Invalid schema | Zod `safeParse` fails → quarantine bad rows → load valid subset → toast "Some data skipped" |

---

## 5. Forward Compatibility (Backend-Ready)

The `StoragePort` interface (`src/data/storagePort.ts`) is the **contract** a future backend would implement:

```typescript
interface StoragePort {
  // Snapshot
  loadSnapshot(): Promise<VoltSnapshot | null>;
  saveSnapshot(snapshot: VoltSnapshot): Promise<{success, error?}>;
  subscribeSnapshot(listener: () => void): () => void;

  // Live session
  loadLiveSession(): Promise<EngineState | null>;
  saveLiveSession(state: EngineState | null): Promise<{success, error?}>;
  subscribeLiveSession(listener: (state) => void): () => void;

  // Cross-tab (becomes WebSocket/polling)
  onStorageEvent(key, handler): () => void;

  // Export/Import
  exportAll(): Promise<ExportPayload>;
  importAll(payload: ExportPayload): Promise<{success, error?}>;

  // Granular subscriptions (become reactive queries)
  sessions: { subscribe(listener): () => void };
  intervals: { subscribe(sessionId, listener): () => void };
  settings: { subscribe(listener): () => void };
}
```

**Migration cost to real backend**: Replace `ValidatedDatabase` with API client implementing `StoragePort`. Zero changes to Engine, Application, or UI layers. Estimated 2–3 days.

---

## 6. Component Architecture (UI Layer)

```
Screens (app/*)
    │
    ├── HomeScreen (dashboard + featured workout + history)
    ├── ProgressScreen (range + stats + trends + PRs)
    ├── HistoryScreen (session list + delete)
    ├── LiveScreen (timer + progress bars + reps/distance + controls)
    ├── SummaryScreen (hero + stat grid + recorded bars + intervals + PRs)
    ├── WorkoutBuilder (create/edit workout)
    ├── WorkoutDetail (view plan + start)
    ├── ExerciseCatalog / CreateExercise
    ├── Onboarding (multi-step)
    └── Settings (not implemented in MVP)

Features (features/*)
    ├── app/VoltProvider (context + db + controller + subscriptions)
    ├── live/ExerciseDemo, exerciseDemoLogic
    ├── workouts/BuilderExerciseCard, ExercisePicker, PreWorkoutView
    ├── history/SessionListRow, deleteSession
    └── onboarding/* (steps, toggles)

UI Components (ui/components/*)
    ├── primitives: Box, Flex, Text, Heading, Button, Pressable, Card, Badge, etc.
    ├── forms: Input, Select, Toggle, Stepper
    ├── feedback: Toast, Modal, ProgressBar, Spinner, Skeleton
    ├── display: StatCard, ProgressTrack, RecordedCompletionCard, WorkRestSplit, PhaseBadge
    ├── navigation: Tabs, SegmentedControl
    ├── charts: LineChart, Sparkline
    └── overlays: ConfirmCard, Tooltip
```

---

## 7. Scalability Notes

| Dimension | Current Capacity | Limit | Mitigation |
|-----------|------------------|-------|------------|
| Sessions | ~1,000 | ~5,000 (AsyncStorage 5MB) | Export + archive old sessions |
| Intervals/session | ~200 | ~500 | Workout planner caps rounds×exercises |
| Snapshot size | ~500 KB | ~5 MB | Compression not needed yet |
| Live session persistence | Every 2s | N/A | Debounce prevents thrash |

**No virtualization needed for MVP**. `FlatList` in History/Progress handles 100s of items at 60fps.

---

## 8. Testing Strategy

| Layer | Tool | Coverage Target |
|-------|------|-----------------|
| Domain (pure functions) | Vitest | 100% |
| Engine (stateMachine, metrics, score) | Vitest | 95% |
| Data (validation, migrate, repair) | Vitest | 90% |
| Application (WorkoutController) | Vitest + mock StoragePort | 85% |
| UI Components | Vitest + React Native Testing Library | 70% (critical paths) |
| E2E (critical flows) | Detox (future) | Manual for MVP |

**Key test files**: `tests/*.test.ts` mirror Engine/Data layer modules.