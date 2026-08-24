# Phase 4 — localStorage Data Layer Specification

**Status:** Implemented. Tests: `tests/data-layer.test.ts` (30 passing). Full suite: 119/119.

This is the most important code in the app: every number the user trusts rests on these guarantees. The layer is the *only* code touching storage directly, and it is written so a real API client could replace the storage adapter without touching feature code.

---

## 1. Module Map

| File | Responsibility |
|------|----------------|
| `src/data/serialize.ts` | Guarded `JSON.parse` / guarded `JSON.stringify`; storage-failure classification |
| `src/data/quarantine.ts` | Per-row Zod validation of every collection; quarantine persistence with cap |
| `src/data/database.ts` | `VoltDatabase` — snapshot lifecycle, ordered atomic writes, migrations + backups, cross-tab reload, integrity/repair |
| `src/data/validatedDatabase.ts` | `StoragePort` implementation wrapping VoltDatabase; live-session key handling; debounced collection writes; web tab-close flush; honest status surface |
| `src/data/validationSchemas.ts` | Zod schemas (row schemas now exported for quarantine) |

---

## 2. Guarantees and Where They Live

### 2.1 Safe serialisation — `serialize.ts`
- **Reads**: `safeParse<T>(raw)` returns a discriminated result; it never throws upward. Rejects null/empty/non-string/malformed with reasons.
- **Writes**: `safeStringify(value)` walks once via replacer and **rejects** (not silently mangles):
  - `NaN`, `Infinity`, `-Infinity` → JSON would write them as `null`, corrupting later math
  - `undefined` inside arrays → JSON would shift semantics to `null`
  - circular references → JSON.stringify would throw late and partially-observed
  Each rejection carries the property path (`<root>.intervals[3].actualSeconds`).
- Undefined *object properties* remain allowed — that is normal optional-field behaviour.

### 2.2 Validation on read AND write — boundary rule
- **On load** (`VoltDatabase.init` / `reloadFromStorage`): whole-payload parse is followed by `sanitizeSnapshotRows`, which validates **each row of each collection** against its exported row schema. One malformed interval no longer destroys the history (old behaviour: bare whole-snapshot parse failure replaced everything with an empty seed).
- **On live-session load**: payload parsed safely, then `EngineStateSchema.safeParse`. Invalid payloads are quarantined AND removed from the live key so they cannot re-break the next boot.
- **On save**: `ValidatedDatabase.saveSnapshot/save` run whole-snapshot Zod first; then `performSave` runs `safeStringify` — non-finite values can never reach disk even if upstream logic regresses.

### 2.3 Row-level quarantine & recovery — `quarantine.ts`
- Bad rows are dropped from memory but preserved: appended to `@hiit-tracker/quarantine` (cap 200, newest first) with `{collection, index, error, data, quarantinedAt}` for inspection/export-assisted bug reports.
- Quarantine persistence failures are swallowed by design — isolating bad data must never block loading good data.
- Surfacing API: `db.getQuarantinedRows()`, `validatedDb.getQuarantinedRows()`.
- Orphan cleanup remains available through existing `validateIntegrity()` + `repair()`.

### 2.4 Versioned schema & forward migration — `database.ts`
- `applyMigrations` unchanged in contract (v1→v2 recomputes durations from interval rows).
- **Pre-migration backup**: whenever incoming `version < DB_VERSION`, the exact pre-migration bytes are copied to `@hiit-tracker/db:pre-migration-backup` before anything overwrites the main key. A migration bug can now cost at most one version of derived fields, never the raw history.
- **Corrupt-payload backup**: unreadable JSON is preserved at `@hiit-tracker/db:corrupt-backup` while the app starts clean.
- **Future versions are never downgraded or discarded**: stored `version: 99` loads as-is (`Math.max` clamp) with rows intact — forward compatibility in both directions.

### 2.5 Atomic, ordered, flushed writes
Storage keys are written atomically by the platform; the real hazard was **interleaved async saves landing out of order**. Fixes:
- All writes funnel through a single-flight promise chain (`writeQueue`) inside `save()` — `setItem` calls cannot interleave or reorder; each queued turn serialises the latest snapshot, so last-request-wins monotonically.
- `flushWrites()` awaits queue drain.
- Web tab-close/background: `pagehide` + `visibilitychange(hidden)` flush both the debounced collection layer and the inner queue. Native background checkpoint already exists at controller level.

### 2.6 Quota / unavailable handling with honest messaging
`classifyStorageError` maps thrown errors to kinds:
| Kind | User meaning (UI copy direction) |
|------|----------------------------------|
| `quota` | "Device storage is full — export your data to free space." |
| `unavailable` | "Private-browsing/device storage unavailable — changes won't persist." |
| `unknown` | Reported verbatim; never guessed. |
| `serialize` | Internal invariant breach; surfaced as failure rather than silent corruption. |

Surfacing: `db.getLastSaveFailure()` / `getLastSaveError()`; wrapper exposes `getStorageStatus()` returning `{ok, failure:{kind,message}, source:'snapshot'|'live'}` for a persistent banner/toast per the Phase 2.4 trust rules. Failures clear automatically on next successful write.

### 2.7 Cross-tab consistency — F-02 fixed
Old bug: the storage handler called `this.init()`, which early-returns on the ready flag — second tab stayed stale forever.
New path: `reloadFromStorage(rawOverride?)`
- applies the external JSON into the live instance (safeParse → sanitize → merge defaults → migrate),
- does **not echo a write back** when applied content serialises identically (prevents ping-pong loops),
- echoes exactly once when migration changed content,
- mirrors external clears as fresh installs,
- ignores corrupt events without nuking current in-memory state.

### 2.8 Stable IDs
Unchanged `createId()` — `crypto.randomUUID()` with timestamp+entropy fallback; collision-resistant across reloads. Covered by round-trip test.

### 2.9 Explicit empty state
Fresh install (`raw == null`) seeds catalog + starter workouts, persists immediately, and reports `source:'fresh'` — intended behaviour, indistinguishable from a deliberate reset, never an error dialog.

### 2.10 Derived-value guards
Unchanged and already centralised (`completionPercent`, `workRestRatio`, `clamp01`); Phase 4's contribution is guaranteeing NaN/Infinity cannot enter storage in the first place, so guards operate on trustworthy inputs.

### 2.11 Backend-swappable interface
`KeyValueStore { getItem, setItem, removeItem }` is injected into `VoltDatabase` (defaults to AsyncStorage). A future API client implements `StoragePort` + `KeyValueStore`; Engine/Application/UI layers import neither.

---

## 3. Test Matrix (`tests/data-layer.test.ts`)

| Group | Cases |
|-------|-------|
| safeParse | valid; malformed; empty string; null; undefined |
| safeStringify | round-trip; circular w/ path; NaN/±Infinity rejected; undefined-in-array rejected; optional undefined props allowed |
| classifyStorageError | quota; unavailable/private-mode; unknown verbatim |
| sanitizeSnapshotRows | mixed valid+invalid rows isolated per collection; missing collections = empty not corrupt; non-object payload survives |
| quarantine store | cap enforcement (200); store-failure tolerance |
| init: fresh | seeds starters, persists, source='fresh' |
| init: corrupt | recovers clean, preserves original bytes at corrupt-backup key |
| init: bad row | quarantines 1 row, loads sibling sessions + intervals, integrity stays valid, quarantine persisted |
| init: v1→v2 | backup written pre-migration; durations recomputed from intervals; version=2 |
| init: future v99 | never downgraded/discarded; data intact |
| save ordering | 3 concurrent upserts → FIFO setItem order, final state complete |
| save: NaN | refused with kind 'serialize', nothing persisted |
| save: quota | kind 'quota', honest error text |
| save: retry | failure clears after success |
| reloadFromStorage | external apply; corrupt event ignored (memory intact); external clear mirrored; identical-content no-echo; migrated-content single echo |
| IDs | survive save/load round-trip across instances |

Run: `npx vitest run tests/data-layer.test.ts`

---

## 4. Deliberate Behaviour Changes (Finding-Traced)

These are the only observable differences vs. pre-Phase-4 behaviour, each tied to a numbered Phase 1 finding:

1. **F-03** — Corrupt/bad rows no longer nuke the whole history; they're quarantined and the rest loads.
2. **F-06** — Unparseable main-key JSON starts clean but keeps bytes at `corrupt-backup` instead of silently discarding.
3. **F-02** — Cross-tab updates actually propagate now (init no-op bug).
4. **F-04** — Concurrent saves are ordered; web close flushes pending debounce.
5. **F-05** — Storage failures surface typed kinds instead of being swallowed.

Everything else — public APIs, screen behaviour, schemas, seed data — is byte-for-byte unchanged.

## 5. Known Deferred Items
- Provider-level duplicate storage listener (`VoltProvider.tsx:96`) still calls `db.init()`; harmless post-fix (inner listener does the real work) and removed during M2 refactor step R8/R9 as planned.
- Whole-snapshot Zod validation on `ValidatedDatabase.save` remains as defence-in-depth; row-quarantine handles the load side.
