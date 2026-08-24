# HIIT Tracker — Documentation Index

Phased build documents (master-prompt run). Read in order.

| Phase | Doc | Contents |
|-------|-----|----------|
| 2 | `01_PRD.md` | Problem, users, MVP scope, user stories, risks, DoD |
| 2 | `02_SRS.md` | 50+ testable requirements, business rules, edge-case matrix |
| 2 | `03_System_Architecture.md` | Stack + rejected alternatives, clean layers, storage contract, backend-swap plan |
| 2 | `04_UI_UX.md` | Visual direction (tokens/hex), **Trust & Honesty rules**, screens |
| 2 | `05_Development_Plan.md` | M0–M7 milestones, dependencies, Definition of Done |
| 3 | `06_Phase3_Target_Architecture.md` | Target tree, import matrix, R1–R10 refactor steps |
| 4 | `07_Phase4_Data_Layer.md` | Persistence guarantees, quarantine, migrations, test matrix |
| 5 | `08_Phase5_Component_System.md` | Component architecture, state rule, a11y contract, best practices |
| 7 | `09_Phase7_Performance.md` | Measured wins (8–14×), tick/write waste removal, scalability triggers |
| 8 | `10_Phase8_Verification.md` | Render-path proof table, edge-case matrix, DoD walkthrough, residual risks |

Examples: [`examples/EXAMPLES.md`](./examples/EXAMPLES.md) — shipped-API snippets incl. empty/error states for every data region.

## Code Map (shipped)

- `src/data/` — the only code touching storage. `serialize.ts`, `quarantine.ts`, `database.ts`, `validatedDatabase.ts`
- `src/engine/` — pure logic (state machine, planner, analytics, scoring). No React/storage.
- `src/application/workoutController.ts` — live-session orchestration
- `src/ui/components/` — canonical component library (see Phase 5 doc)
- `src/ui/_experimental/` — parked earlier library; excluded from tsconfig; do not import
- `tests/` — Vitest suites mirroring engine/data layers

## Commands

```bash
npm test          # vitest — 119 tests
npm run typecheck # tsc --noEmit — 0 errors
npm start         # expo
```

## Findings Ledger

Canonical tracker: [`findings.md`](./findings.md). F-01…F-10 from Phase 1 plus mid-build discoveries F-11 (dead stub module) and F-12 (dead `finish()` with misleading ternary) — all CLOSED with named test/grep evidence.
