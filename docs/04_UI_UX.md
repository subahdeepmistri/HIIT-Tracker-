# UI/UX Document — HIIT Tracker

## 1. Design Intent

**One sentence:** A dark, high-contrast, data-first interface where every number is earned from real recorded work and every gap is named honestly — so the athlete trusts the dashboard as much as they trust their own effort.

The visual language is **"instrument panel, not social feed."** Large condensed numerals read at arm's length mid-workout. Calm surfaces stay out of the way between sessions. Nothing decorative competes with the data.

---

## 2. User Journeys

### 2.1 First Run
```
Open app → Onboarding (welcome → units → defaults → sound/haptics) 
        → Home (starter workouts visible, empty history)
        → Start "Morning HIIT" → Live session (countdown 10s)
        → Work/Rest cycles → Finish → Summary ("Great work")
        → Done → Home (history now shows 1 session, progress bars populated)
```

### 2.2 Returning Athlete
```
Open app → Home (greeting + featured workout + week stats + recorded bars)
        → Start today's workout → Live → Summary → History grows
        → Progress tab → switch range → trends update
```

### 2.3 Interrupted Session
```
App killed mid-session → Reopen → Home shows "Interrupted session" card
        → Resume (timer catches up) | Save partial | Discard
```

---

## 3. Navigation Structure

**Tab bar** (bottom, persistent): Home · Workouts · Progress · History · Profile

**Stack routes**: `/live/[sessionId]` (full-screen modal), `/summary/[sessionId]`, `/workouts/builder`, `/workouts/[id]`, `/exercises/*`, `/calendar`, `/onboarding`

**Rules:**
- Live screen hides tab bar; hardware/gesture back prompts confirm
- Summary is reached only via finalize; "Done" replaces to Home
- Delete always requires confirmation; destructive actions styled `danger`

---

## 4. Screens

### 4.1 Home
| Zone | Content |
|------|---------|
| Header | Greeting by time of day + "Ready to train?" |
| Interrupted card | Only when `db.sessions.inProgress()` exists — Resume / Save partial / Discard |
| Featured workout | Name + planned duration · rounds · exercises + Start |
| Week progress | Sessions / Active / Training mini-stats |
| Recorded bars | This week's completion tracks from interval rows |
| Recent sessions | Last 4 completed/partial with mini progress bars |

### 4.2 Live Session (full-screen)
| Zone | Content |
|------|---------|
| Top | PhaseBadge + Discard |
| Context | Round x/y, exercise name (display type, 42px), "Next …" |
| Demo | Exercise animation (disabled under reduced motion) |
| Hero timer | 112px condensed numeral, accent (work) / rest-blue (rest) |
| Tracks | Interval · Workout · Rounds done · Reps* · Distance* (*when tracked) |
| Inputs | Reps ± / Distance ± during WORK only |
| Controls | Pause/Skip row, Finish/Discard row |

### 4.3 Summary (post-session)
Hero duration (72px) → stat grid (Active, Rest, Exercises, Rounds, Total reps, Completion) → RecordedCompletionCard with per-interval tracks → Best/weakest interval → New PRs → Done / Delete.

### 4.4 Progress
Range segmented control (7D/30D/90D/All) → stat cards → RecordedCompletionCard → trend charts (Duration, Work completion, Active, Rest, + conditional Reps/Score/Distance) → Heart rate honesty note → Training suggestion → Personal records.

### 4.5 History
Session rows: badge (Partial/Completed), name, date+time · duration · completion %, progress bar, delete icon.

---

## 5. Trust & Honesty Rules (Core Contract)

These rules are binding on every screen. They exist because the core product promise is *the numbers are real*.

### 5.1 The Four States of a Value

Every displayed metric is in exactly ONE of these states, and the UI must distinguish them visually AND textually:

| State | Meaning | Display | Example |
|-------|---------|---------|---------|
| **VALUE** | Real recorded data exists | Number + filled bar | `82%` with bar at 0.82 fill |
| **NO_DATA** | Input never existed for this workout plan | Muted "Not enough data" + empty track, no fill | Reps track on a TIME-only workout |
| **NOT_RECORDED_YET** | Input exists but nothing logged yet (e.g., live reps before first tap) | Muted "Recorded · no target set" info-style OR zeroed counter awaiting input | Reps counter showing 0 with ± buttons active |
| **FAILED** | Data should exist but couldn't load/compute | Warning tone + plain-language reason + retry affordance | "Couldn't load history — Retry" |

**Never:** render `0%` for NO_DATA. Never render `—` for two different meanings. Never show a filled bar without a numeric detail.

### 5.2 Provenance Labeling
- Cards built from stored intervals carry a static footnote: *"Rebuilt from stored interval rows. Missing inputs stay empty."*
- Derived aggregates state their method: *"Average across N sessions"* or *"Mean of sessions that recorded this input."*
- No interpolation. Empty days in trends are gaps, not zeros.

### 5.3 Save Confirmation
- Every successful finalize navigates to Summary (implicit confirmation — you see your own data rendered back).
- Save failures surface via toast within 1 tick: *"Save failed — [reason]. Your last completed save was [time]."* Never silent failure.
- Live persistence failures show a subtle persistent banner: *"Not saving — storage unavailable."*

### 5.4 Anti-Patterns (Prohibited)
- Fake progress bars (animation implying work not happening)
- Placeholder numbers (`0` where null belongs)
- Skeletons that never resolve to content or an error
- Colour alone conveying state (always pair with icon/text)
- Optimistic values not yet persisted shown as final

---

## 6. Visual Direction

### 6.1 Type Scale

Display face: **Barlow Condensed Bold** — tall, athletic, reads instantly at distance.
UI face: **Barlow** Regular/Medium/SemiBold.

| Token | Size/Line | Use |
|-------|-----------|-----|
| display-xl | 112/112, ls -2 | Live hero timer |
| display-lg | 72/74 | Summary hero duration |
| display | 40/42, ls -0.6 | Screen headings |
| stat-lg | 36 | StatCard value lg |
| stat | 28 | StatCard value md |
| title | 22/28 | Card titles |
| body | 16/24 | Primary reading |
| body-sm | 14/20 | Secondary |
| caption | 13/18 | Footnotes, captions |
| label | 12/16, ls 1.2, uppercase | Section labels |
| micro | 11/14 | Timestamps, meta |

### 6.2 Palette

Dark is default; light mirrors roles. All pairs meet WCAG AA against their intended background.

| Token | Dark Hex | Role |
|-------|----------|------|
| bg | `#07080A` | Page background |
| surface | `#111318` | Cards |
| surface2 | `#181C24` | Wells, inputs, track backgrounds |
| line | `#2A3140` | Borders, dividers |
| text | `#F4F1EA` | Primary text (warm off-white) |
| muted | `#9AA3B2` | Secondary text |
| accent | `#E8FF3D` | Primary action, work phase, progress fill |
| accentInk | `#111318` | Text on accent |
| rest | `#7DD3FC` | Rest phase, recovery info |
| warn | `#F5A524` | Warnings, partial states |
| danger | `#FF5A5A` | Destructive, errors |
| success | `#3DDC97` | PRs, positive deltas |
| info | `#60A5FA` | Recorded-only/no-target bars |

Light theme swaps: bg `#F6F4EE`, surface `#FFFFFF`, surface2 `#EFECE4`, line `#D8D3C8`, text `#12141A`, muted `#4B5563`, rest `#0369A1`, warn `#B45309`, danger `#DC2626`, success `#047857`, info `#2563EB`. Accent unchanged (passes AA on both).

### 6.3 Spacing Scale

Base-4 grid: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 48`

Screen padding 20. Card padding 20. Intra-card gaps 8–16. Between-card gaps 16–20.

### 6.4 Radii & Elevation

Radii: sm 8 (chips) · md 16 (inputs, small buttons) · lg 24 (cards, sheets) · pill 999 (badges, progress tracks).

Elevation: flat by default (1px `line` border). Interactive cards gain soft shadow on press only (iOS y2 blur8 α0.08 / Android elev 3). Overlays use `overlay` scrim rgba(7,8,10,0.72).

### 6.5 Motion

| Token | ms | Use |
|-------|----|-----|
| fast | 160 | Press feedback, toggles |
| base | 220 | Card transitions, toasts |
| slow | 320 | Sheet slide |

Live timer updates **do not animate** — the numeral snaps each second. Animation implies precision we don't have. Reduced-motion setting disables exercise demo loop and round-complete hold.

### 6.6 Why These Choices Help Trust

- **Condensed numerals at huge sizes** — legible mid-burpee; no ambiguity about which number matters.
- **One accent colour doing all progress work** — yellow-green fill = recorded work, everywhere, no exceptions. Rest blue never means progress.
- **Empty ≠ zero styling** — NO_DATA tracks render track-only at reduced opacity with muted text; VALUE tracks get full-opacity fill. Distinguishable at a glance and by screen reader.
- **Flat surfaces** — shadows reserved for interactivity; depth doesn't imply importance, data does.

---

## 7. Component Specifications

### 7.1 ProgressTrack (canonical bar)

Props: `label`, `detail`, `caption?`, `value: number|null`, `color?`, `size?`, `showAsRecordedOnly?`.

Behaviour:
- `value=null` → NO_DATA: track at 0.72 opacity, detail in muted, accessibilityValue `{text:'Not enough data'}`
- `value∈[0,1]` → fill width `${value*100}%`, detail strong
- `value>1` → capped fill + "Over plan" caption (warn tone)
- `showAsRecordedOnly` → info-colour full pill + caption "Recorded · no target set"
- Always `accessibilityRole="progressbar"` with real `now`, or explicit text state

### 7.2 StatCard

Label (uppercase micro) over display-numeral value over optional hint. `value='Not enough data'` renders muted, smaller, non-hero — it is honest emptiness, not a failed stat.

### 7.3 PhaseBadge

Colour + text pairs (never colour alone): COUNTDOWN/muted, WORK/accent, REST/rest, PAUSED/warn, COMPLETED/success.

### 7.4 Toast

Variants info/success/warn/error, each with distinct icon glyph + border + bg tint. `role="alert"` aria-live polite. Auto-dismiss 4s, action button, manual dismiss.

### 7.5 EmptyState

Title + explanatory body + optional action. Body copy names WHY it's empty ("No sessions recorded this week. Bars appear after you complete a workout.") — never generic filler.

---

## 8. Forms

- Labels always visible above field (never placeholder-as-label)
- Errors inline below field, danger colour + ⚠ prefix, linked via `aria-describedby`
- Numeric inputs use `inputMode="numeric"`, steppers for bounded counts
- Validation on submit; errors don't clear until fixed or resubmitted

## 9. Loading / Error / Empty States Inventory

| Surface | Loading | Error | Empty |
|---------|---------|-------|-------|
| App boot | Splash retained until `db.init()` resolves | Corrupt store → fresh seed + toast | — |
| History list | Instant (sync snapshot) | Save-failure toast | "No sessions yet…" |
| Progress stats | Instant | — | "No recorded work…" EmptyState |
| Trend charts | Instant | — | Card hidden entirely (no empty chart frame) |
| Live restore | Brief hydrate, timer continues from stored targetEndAt | Invalid stored state → discard silently + home | — |
| Export/Import | Button spinner | Alert with reason | — |

## 10. Responsive Behaviour

Breakpoints via `useWindowDimensions`: compact < 480, medium 480–1024, regular > 1024.

- Stat grids: 2-up compact → 3-up medium → 4-up regular (`minWidth:'45%'` flex-wrap)
- Live hero timer scales 112→96→80 as width shrinks below 380
- Web ≥ 1024: content max-width 720 centered; tab bar becomes top rail
- Touch targets ≥ 48×48 everywhere (`theme.touch.min`); live controls 64

## 11. Accessibility Contract

- Every interactive element: role, label, state (`disabled`, `selected`, `checked`)
- Progressbars expose `min/max/now` or explicit text — never a bare coloured div
- `aria-live="polite"` on toasts; timer announces phase changes, not every second
- Focus: visible on web (2px accent outline offset 2), logical order
- Contrast: all text ≥ 4.5:1; accent-on-bg 13:1; large numerals ≥ 3:1
- No information by colour alone — badges/patterns/text accompany every hue
- Hit-slop 8 minimum around small controls

## 12. Design Principles (Ranked)

1. **Earned numbers only** — if the math can't be done from stored rows, the slot stays empty
2. **Legibility under exertion** — size and contrast beat elegance
3. **Calm between sessions** — flat, quiet chrome lets data carry energy
4. **Honest gaps** — naming absence builds more trust than filling it
5. **One accent, one meaning** — yellow-green is recorded work; nothing else is
