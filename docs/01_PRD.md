# Product Requirements Document — HIIT Tracker

## 1. Problem Statement

People who do High-Intensity Interval Training (HIIT) want to log their workouts, run live sessions with a timer that handles work/rest/transition phases, and see honest progress analytics derived from what they actually recorded — not from planned templates or interpolated data. Current solutions either:

- Require a backend/account (overkill for personal use)
- Show misleading "progress" that assumes you completed what you planned
- Lack proper interval-level tracking (reps, distance, partial completions)
- Don't persist reliably across app restores or device tabs

## 2. Target Users

- **Primary**: Individuals doing HIIT 2–6×/week who want a local-first tracker with trustworthy analytics
- **Secondary**: Coaches/trainers who may later want to review a client's exported data

## 3. Goals

| Goal | Success Metric |
|------|----------------|
| **Trustworthy progress** | Every displayed %/bar/counter equals the math on stored interval rows; missing inputs show "Not enough data", never 0% or — |
| **Reliable persistence** | No data loss on app kill, tab close, storage quota, or version upgrade; cross-tab sync works |
| **Live session integrity** | Timer survives background/foreground, unload, and restores exactly where it left off |
| **Fast, offline-first** | Cold start < 2s on 3-year-old phone; fully functional in airplane mode |
| **Export ownership** | User can export all data as JSON and re-import on another device |

## 4. Core Features (MVP Scope)

| Feature | Description |
|---------|-------------|
| **Workout builder** | Create workouts: name, rounds, ordered exercises with work/rest/planned reps/distance |
| **Exercise catalog** | Built-in library (30+ exercises) + custom exercises with category, equipment, tracking mode |
| **Live session** | State-machine timer: countdown → work → rest → transition → round complete → … → completed/partial; pause/skip/finish/discard; reps/distance input during work |
| **Session finalize** | On complete/partial: persist intervals, compute performance record, update personal records, sync training days |
| **History** | List completed/partial sessions with date, duration, work completion %, delete with confirmation |
| **Progress dashboard** | Range selector (7/30/90/all days); stat cards (sessions, active time, streak, rounds, intervals, reps, score); recorded-completion bars (work%, intervals%, rounds%, reps%, distance%, performance); trend charts (duration, completion, active, rest, reps, score, distance); personal records |
| **Summary screen** | Post-session: hero duration, stat grid, recorded-completion bars with per-interval breakdown, best/weakest interval, new PRs |
| **Settings** | Theme (system/light/dark), distance unit, default work/rest/rounds, audio/haptics toggles, reduced motion |

## 5. Out of Scope (Explicitly Not in MVP)

- Cloud sync / multi-device / accounts
- Social / sharing / leaderboards
- Heart-rate sensor integration (UI shows "not connected" honestly)
- Workout scheduling / calendar reminders
- Apple Health / Google Fit sync
- Voice coaching
- Workout templates beyond the starter set

## 6. User Stories (MVP)

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| US-01 | As a user, I create a workout with exercises and planned work/rest/reps | Workout appears in list; can be started |
| US-02 | As a user, I start a live session and see countdown → work → rest phases | Phase badge, timer, progress bars update every second |
| US-03 | As a user, I tap ± to log reps during a work interval | Reps counter updates; stored in interval draft |
| US-04 | As a user, I pause/resume/skip/finish/discard a session | State machine transitions correctly; data persists |
| US-05 | As a user, I complete a session and see a summary with real recorded data | Summary shows actual seconds, reps, completion % from intervals |
| US-06 | As a user, I view history and see only completed/partial sessions | Cancelled/in-progress excluded; deletion requires confirm |
| US-07 | As a user, I switch progress range (7/30/90/all) and stats update | All stat cards, bars, charts recompute from filtered sessions |
| US-08 | As a user, I see "Not enough data" where I haven't logged reps/distance | No 0%, no — ; missing inputs stay empty |
| US-09 | As a user, I close the app mid-session and resume exactly where I left off | Live session key restores EngineState; tick catches up |
| US-10 | As a user, I export my data and import it on another device | Export JSON contains all collections; import restores identically |

## 7. Assumptions

- localStorage/AsyncStorage available (≥ 5 MB)
- No backend; all validation/migration/integrity client-side
- Single user per device (no multi-account)
- Workouts are time-based primarily; reps/distance optional per exercise

## 8. Risks

| Risk | Mitigation |
|------|------------|
| Storage quota exceeded | Catch `QuotaExceededError`; notify user; offer export+clear |
| Corrupt/malformed stored JSON | Zod validation on every read; quarantine bad rows; repair command |
| Version migration breaks old data | Versioned schema; `applyMigrations` runs on every load; never discard unrecognised fields |
| Cross-tab write conflict | `storage` event listener re-loads snapshot; debounced writes reduce collisions |
| Live session lost on crash | Debounced persist (2s) + checkpoint on background + finalize on complete |
| Floating-point drift in percentages | All completion math uses `completionPercent` guard; clamped 0–100; `NaN` → insufficient |

## 9. Acceptance Criteria (Definition of Done for MVP)

1. All 10 user stories pass manual verification
2. Phase 1 findings 1–10 resolved (see findings list)
3. Empty storage → onboarding → first workout → live → summary → history → progress works end-to-end
3. Corrupt storage → app loads, quarantines bad rows, shows repair option
4. Old-version snapshot (v1) → migrates to current version without data loss
5. Two tabs open → changes in one appear in other within 2s
6. App killed mid-session → live session restores on reopen
7. Export → import round-trip produces identical snapshot
8. Accessibility audit: all progress bars expose real value via ARIA; no color-only info; focus visible
9. Responsive: works at 320px, 768px, 1440px widths