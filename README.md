# HIIT Tracker

An offline-first HIIT training app.

It never overwrites a planned workout with what you actually did. Every statistic on screen is computed from recorded session data, or it is shown as **Not enough data**.

## Why this stack

| Need | Choice |
| --- | --- |
| Native workout UX, haptics, keep-awake | Expo 57 + React Native |
| Type-safe engines you can unit test | TypeScript + Vitest |
| Offline persistence on web and device | AsyncStorage document DB |
| Timestamp-accurate timer | Pure state machine, no `setInterval` for elapsed time |
| Preview without full Xcode | Expo web + Expo Go |

The live timer is **not** network-dependent. A no-op `SyncPort` exists for a future backend. Sync is not implemented.

## Architecture

```
UI (Expo Router)
  → WorkoutController
    → WorkoutEngine (timestamp state machine)
    → CalculationEngine / Score / PRs
    → Local database
```

Calculation logic does not live in React components.

## Run

```bash
cd "/Volumes/SSD B/PROJECT-infinity/HITT Tracker"
npm install
npm test
npm run typecheck
npx expo start
```

- Press `w` for a mobile-width web preview
- Scan the QR code in Expo Go for haptics, keep-awake, and native audio

## Tests

```bash
npm test
```

Covers completion math, work:rest density, distance completion, timer backgrounding, pause, skip (planned vs actual), score renormalization, PRs, dashboard trends, and recovery empty states.

## Product rules

- Planned and actual values are separate fields
- Heart rate is never estimated — UI says **Heart-rate data unavailable**
- Calories are not shown
- Empty history stays empty
- Recovery copy is a training suggestion, not medical advice
