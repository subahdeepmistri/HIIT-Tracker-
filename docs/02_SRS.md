# Software Requirements Specification — HIIT Tracker

## 1. Functional Requirements

### 1.1 Workout Management

| ID | Requirement | Test |
|----|-------------|------|
| FR-WO-01 | User can create a workout with name, notes, rounds (≥1) | Create workout → appears in `db.workouts.list()` with `isArchived=false` |
| FR-WO-02 | User can add/remove/reorder exercises in a workout | `db.workouts.plan(id)` returns exercises in `orderIndex` order |
| FR-WO-03 | Each workout exercise stores: exerciseId, trackingMode, plannedWorkSeconds (>0), plannedRestSeconds (≥0), optional plannedReps (>0), optional plannedDistance (>0), distanceUnit | `WorkoutExerciseSchema` validates on upsert |
| FR-WO-04 | User can archive a workout (hidden from builder, kept for history) | `workout.isArchived=true`; excluded from `db.workouts.list()` |
| FR-WO-05 | Starter workouts seed on first run | Fresh install → `db.workouts.list().length ≥ 1` |

### 1.2 Exercise Catalog

| ID | Requirement | Test |
|----|-------------|------|
| FR-EX-01 | Built-in catalog (≥30 exercises) loads on first run | `db.exercises.list().filter(e=>!e.isCustom).length ≥ 30` |
| FR-EX-02 | Each exercise has: name, category, movementType, equipment[], defaultWorkSeconds, defaultRestSeconds, trackingMode, instructions, safetyNotes, difficulty (1–5) | `ExerciseSchema` validates |
| FR-EX-03 | User can create custom exercises (isCustom=true) | Custom exercise appears in catalog, editable/deletable |
| FR-EX-03 | Custom exercises persist across app restarts | Restart app → custom exercise still in `db.exercises.list()` |

### 1.3 Live Session

| ID | Requirement | Test |
|----|-------------|------|
| FR-LS-01 | Starting a workout creates `EngineState` with planned slots from `planWorkout` | `controller.start()` → `state.slots.length > 0`, `state.status='LIVE'` |
| FR-LS-02 | Timer ticks every 1s (configurable `DEFAULTS.liveTickMs`) | `controller.tick()` advances `phaseStartedAt`/`targetEndAt` |
| FR-LS-03 | Phases transition: COUNTDOWN → WORK → REST → TRANSITION → ROUND_COMPLETE → … → COMPLETED | `getLiveView().phase` matches expected sequence |
| FR-LS-04 | Pause/Resume preserves remaining time exactly | Pause at T, resume at T+Δ → `targetEndAt` shifted by Δ |
| FR-LS-05 | Skip advances to next slot, marks current as SKIPPED | `controller.skip()` → `intervals.last().outcome='SKIPPED'` |
| FR-LS-06 | Reps input (± buttons) updates `currentReps` in EngineState | `controller.recordReps(n)` → `state.currentReps=n` |
| FR-LS-07 | Distance input (± buttons) updates `currentDistance` | `controller.recordDistance(d)` → `state.currentDistance=d` |
| FR-LS-08 | Finish (complete) finalizes session, persists intervals + performance record | `controller.complete()` → `FinalizeResult` with session status COMPLETED |
| FR-LS-09 | Save Partial finalizes as PARTIAL, keeps recorded intervals | `controller.savePartial()` → session status PARTIAL |
| FR-LS-10 | Discard deletes session + intervals, clears live key | `controller.discard()` → session removed, `AsyncStorage.getItem(liveKey)===null` |
| FR-LS-11 | Live session persists to `@hiit-tracker/live-session` every 2s + on background | `AsyncStorage.getItem(liveKey)` updates within 2s of any change |
| FR-LS-12 | App kill + reopen → `hydrateFromStorage()` restores EngineState, tick catches up | Kill app, reopen, navigate to live → timer resumes at correct remainingMs |
| FR-LS-13 | Countdown phase plays cue at each second >0 | `playCue('countdown')` called at each second boundary |
| FR-LS-14 | Work phase start plays 'work' cue; rest plays 'tap'; complete plays 'complete' | Phase change → correct cue played |

### 1.4 Session Finalization & Analytics

| ID | Requirement | Test |
|----|-------------|------|
| FR-SF-01 | On finalize: intervals replaced for session, performance record upserted, session status set, training days synced | `db.intervals.listBySession(id)`, `db.performance.getBySession(id)`, `db.sessions.get(id).status`, `db.trainingDays.list()` all consistent |
| FR-SF-02 | PerformanceRecord computes: totalDuration, totalActive, totalRest, exerciseCount, completedRounds, completedIntervals, plannedWorkSeconds, plannedRestSeconds, plannedReps, plannedIntervals, plannedRounds, plannedDistanceMeters, actualDistanceMeters, totalReps, workCompletionPercent, repCompletionPercent, intervalCompletionRate, roundCompletionPercent, distanceCompletionPercent, workRestRatio, performanceScore, bestIntervalId, weakestIntervalId | All fields present and match `calculateSessionMetrics` + `scoreFromMetrics` |
| FR-SF-03 | Personal records detected and applied: LONGEST_WORK_INTERVAL, MOST_REPS_EXERCISE, MOST_COMPLETED_ROUNDS, FASTEST_DISTANCE, HIGHEST_WORKOUT_COMPLETION, LONGEST_ACTIVE_TIME, BEST_EXERCISE_COMPLETION | `detectPersonalRecords` returns earned records; `records.replaceAll` persists them |
| FR-SF-04 | Training days rebuilt from completed/partial sessions; rest days preserved | `trainingDaysFromSessions` output matches sessions by date |
| FR-SF-05 | Work completion % = actualWorkSeconds / plannedWorkSeconds × 100 (guarded) | `completionPercent(planned, actual)` returns `Metric<number>` |
| FR-SF-06 | Rep completion % = actualReps / plannedReps × 100 (only for exercises with plannedReps) | Exercises without plannedReps → `insufficient('no planned reps')` |
| FR-SF-07 | Interval completion % = completedWorkIntervals / totalWorkIntervals × 100 | `completionPercent(work.length, completedWork.length)` |
| FR-SF-08 | Round completion % = completedRounds / plannedRounds × 100 | All rounds must have every exercise COMPLETED |
| FR-SF-09 | Distance completion % = actualDistanceMeters / plannedDistanceMeters × 100 (only for exercises with plannedDistance) | Unit conversion to meters via `Units.toMeters` |
| FR-SF-10 | Work:Rest ratio = totalWorkSeconds / totalRestSeconds (∞ if rest=0 & work>0) | `workRestRatio` returns `Metric<WorkRestAnalysis>` |

### 1.5 History & Progress

| ID | Requirement | Test |
|----|-------------|------|
| FR-HP-01 | History screen lists only COMPLETED + PARTIAL sessions, newest first | `db.sessions.list().filter(s=>s.status!=='IN_PROGRESS'&&s.status!=='CANCELLED')` |
| FR-HP-02 | Session row shows workout name, date, duration, work completion % | Data from `db.performance.getBySession(id)` |
| FR-HP-03 | Progress dashboard range selector (7/30/90/all) filters sessions + performance | `filterSessions(sessions, range, now)` |
| FR-HP-04 | Stat cards: completed, partial, training time, active time, rest time, avg duration, streak, rounds, intervals, exercises, total reps | `dashboardStats(sessions, performance, now)` |
| FR-HP-05 | RecordedCompletionCard tracks: work%, intervals%, rounds%, reps%, distance%, performance (mean across sessions) | `aggregateSessionProgress(snapshots).tracks` |
| FR-HP-06 | Trend charts: duration, completion, active, rest, reps, score, distance | `trendPoints(sessions, performance, range, now, field)` |
| FR-HP-07 | Personal records list: kind, formatted value, unit | `db.records.list()` filtered to range |
| FR-HP-08 | Empty range shows "No recorded work" + explanatory body | `stats.sessionsRecorded===0` → EmptyState |

### 1.6 Settings & Onboarding

| ID | Requirement | Test |
|----|-------------|------|
| FR-SO-01 | Settings persist: theme, distanceUnit, countdownSeconds, defaultWorkSeconds, defaultRestSeconds, defaultRounds, sound/haptics toggles, countdownSound, restEndingAlert, completionSound, hapticIntervalChanges, hapticCountdown, hapticComplete, remindersEnabled, reminderHour, reminderMinute, reducedMotion | `UserSettingsSchema` validates; `db.settings.update()` persists |
| FR-SO-02 | Onboarding steps: welcome → units → defaults → sound/haptics → reminders → complete | `user.onboardingStep` advances; `onboardingCompletedAt` set on finish |
| FR-SO-03 | Theme applies immediately (system/light/dark) | `VoltThemeProvider` reads `settings.theme` |
| FR-SO-04 | Reduced motion disables round-complete pause and animation | `DEFAULTS.roundCompleteSeconds` overridden to 0 |

### 1.7 Persistence & Integrity

| ID | Requirement | Test |
|----|-------------|------|
| FR-PI-01 | Snapshot versioned (`DB_VERSION`); migrations run on load | `applyMigrations` called in `VoltDatabase.init()` |
| FR-PI-02 | Zod validation on read: invalid rows quarantined, valid data loads | `ValidatedDatabase.init()` calls `validateLoadedSnapshot()` |
| FR-PI-03 | Zod validation on write: invalid snapshot rejected | `ValidatedDatabase.save()` validates before `AsyncStorage.setItem` |
| FR-PI-04 | Debounced writes (2s) + immediate on finalize | `ValidatedDatabase.scheduleFlush()` + `WorkoutController.flushPersistQueue()` |
| FR-PI-05 | Cross-tab sync via `storage` event → re-init + notify | Two tabs: change in one → other updates within 2s |
| FR-PI-06 | Live session separate key; validated on load; discarded on invalid | `loadLiveSession()` validates `EngineStateSchema` |
| FR-PI-07 | Export JSON contains all collections + version | `exportAll()` → `ExportPayload` with all arrays |
| FR-PI-08 | Import validates full snapshot before replacing | `importAll()` calls `validateSnapshot` |
| FR-PI-09 | Repair command removes orphaned references (intervals→sessions, intervals→exercises, etc.) | `validateIntegrity()` → issues=0 after `repair()` |
| FR-PI-10 | Delete session removes intervals, performance, rebuilds PRs & training days | `applySessionDelete` output verified |

## 2. Data Requirements

| Entity | Key Fields | Validation |
|--------|------------|------------|
| User | id, displayName?, onboardingCompletedAt?, onboardingStep?, onboardingVersion?, createdAt | `UserSchema` |
| UserSettings | theme, distanceUnit, countdownSeconds, defaultWorkSeconds, defaultRestSeconds, defaultRounds, soundEnabled, hapticsEnabled, countdownSound, restEndingAlert, completionSound, hapticIntervalChanges, hapticCountdown, hapticComplete, remindersEnabled, reminderHour, reminderMinute, reducedMotion | `UserSettingsSchema` |
| Exercise | id, name, category, movementType, equipment[], defaultWorkSeconds, defaultRestSeconds, trackingMode, instructions, safetyNotes, difficulty, isCustom, createdAt, updatedAt | `ExerciseSchema` |
| Workout | id, name, notes, rounds, isArchived, createdAt, updatedAt | `WorkoutSchema` |
| WorkoutExercise | id, workoutId, exerciseId, orderIndex, trackingMode, plannedWorkSeconds, plannedRestSeconds, plannedReps?, plannedDistance?, distanceUnit?, notes? | `WorkoutExerciseSchema` |
| WorkoutSession | id, workoutId, workoutNameSnapshot, status, startedAt, endedAt?, countdownSecondsUsed, plannedRounds, plannedExerciseCount, interruptedAt?, resumePayloadJson?, averageHeartRate?, maximumHeartRate?, heartRateSamplesJson? | `WorkoutSessionSchema` |
| IntervalSession | id, sessionId, exerciseId, exerciseNameSnapshot, roundIndex, exerciseIndex, phase, plannedSeconds, actualSeconds, plannedReps?, actualReps?, plannedDistance?, actualDistance?, distanceUnit?, startedAt, endedAt, outcome | `IntervalSessionSchema` |
| PerformanceRecord | id, sessionId, workoutId, createdAt, totalDurationSeconds, totalActiveSeconds, totalRestSeconds, exerciseCount, completedRounds, completedIntervals, plannedWorkSeconds, plannedRestSeconds, plannedReps?, plannedIntervals?, plannedRounds?, plannedDistanceMeters?, actualDistanceMeters?, totalReps?, workCompletionPercent?, repCompletionPercent?, intervalCompletionRate?, roundCompletionPercent?, distanceCompletionPercent?, workRestRatio?, performanceScore?, bestIntervalId?, weakestIntervalId? | `PerformanceRecordSchema` |
| PersonalRecord | id, kind, exerciseId?, workoutId?, value, unit, sessionId, earnedAt | `PersonalRecordSchema` |
| TrainingDay | date (YYYY-MM-DD), status, sessionIds[] | `TrainingDaySchema` |

## 3. Business Rules

| Rule | Description |
|------|-------------|
| BR-01 | Workout must have ≥1 exercise to be startable | `planWorkout` throws if `slots.length===0` |
| BR-02 | Work interval plannedSeconds > 0 | `WorkoutExerciseSchema.plannedWorkSeconds.positive()` |
| BR-03 | Rest interval plannedSeconds ≥ 0 | `WorkoutExerciseSchema.plannedRestSeconds.nonnegative()` |
| BR-04 | TrackingMode determines which optional fields are meaningful: TIME→none, REPS→plannedReps, DISTANCE→plannedDistance+distanceUnit, HYBRID→any combination | UI shows/hides reps/distance inputs accordingly |
| BR-05 | Completion % only computed when planned > 0 and actual ≥ 0 | `completionPercent` returns `insufficient` otherwise |
| BR-06 | Round complete only when every exercise in round is COMPLETED | `countCompletedRounds` logic |
| BR-07 | Personal records only earned from COMPLETED or PARTIAL sessions | `detectPersonalRecords` filters sessions |
| BR-08 | Training day status: COMPLETED if any session COMPLETED, else PARTIAL if any PARTIAL, else REST/NONE | `trainingDaysFromSessions` |
| BR-09 | Live session cannot exceed 24h (sanity guard) | `targetEndAt` - `startedAt` < 86,400,000 |
| BR-10 | Reps/distance only recorded during WORK phase | `recordReps`/`recordDistance` no-op in other phases |

## 4. Edge Cases (Explicitly Handled)

| Case | Handling |
|------|----------|
| Empty storage (first run) | `emptySnapshot()` seeds catalog + starter workouts; onboarding starts |
| Corrupt JSON in storage | `JSON.parse` in try/catch → `emptySnapshot()` |
| Partial JSON (missing arrays) | Merge with `emptySnapshot()` defaults |
| Old schema version | `applyMigrations` upgrades stepwise |
| Storage quota exceeded | Catch error → notify user → offer export+clear |
| Storage disabled (private browsing) | `AsyncStorage` throws → caught → app works in-memory only (no persist) |
| Two tabs writing concurrently | `storage` event triggers re-init; last-write-wins at key level |
| Unmount mid-write | Debounced flush may lose last <2s; finalize forces immediate flush |
| Midnight rollover during session | `localDateKey` uses local date; training day assigned to end date |
| Division by zero in completion | `completionPercent` returns `insufficient('planned is zero')` |
| NaN/Infinity in arithmetic | All `Metric` computations guard with `Number.isFinite` |
| Duplicate IDs | `createId` uses `crypto.randomUUID` or timestamp+random |
| Very large dataset (10k sessions) | `FlatList` virtualization; `dashboardStats` O(n) but acceptable |
| Rapid repeated input (reps ±) | State updates synchronous; UI reflects immediately |

## 5. Security (Client-Side Only)

| Requirement | Enforcement |
|-------------|-------------|
| No sensitive data in localStorage | Only workout data; no PII beyond optional displayName |
| No auth (by design) | Single-user local app; no gates to bypass |
| Export contains all data | User owns their data; can backup/delete |
| Import validates before replace | Prevents malicious JSON injection |
| No eval/Function constructor | None used |

## 6. Performance Requirements

| Metric | Target |
|--------|--------|
| Cold start (TTI) | < 2s on iPhone SE 2020 / Pixel 4a |
| Live tick latency | < 16ms (60fps) |
| Progress dashboard render (100 sessions) | < 100ms |
| Snapshot save (5 MB) | < 200ms |
| Export JSON (5 MB) | < 500ms |
| Memory growth over 1h live session | < 10 MB |

## 7. Acceptance Criteria (Per Requirement)

Each FR-XXX above has a **Test** column defining pass/fail. A requirement passes iff the test procedure produces the expected result. All 50+ functional requirements must pass for MVP release.