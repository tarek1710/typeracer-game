# TypeRacer — Adaptive Typing Speed Racing Game

Type to drive. Your recent typing speed and accuracy set your car's target speed; the car accelerates toward it, and its position is the integral of its speed. Four AI rivals with different personalities use the *same* physics, scaled to your calibrated skill.

## Install & run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # simulation tests (Vitest)
npm run build      # type-check + production build -> dist/
npm run build:single   # optional: one self-contained HTML file -> dist-single/
```

Requires Node 18+. Stack: React 18, TypeScript, Vite, Tailwind CSS 3, `requestAnimationFrame` loop, DOM-based track, `localStorage`. Icons are small inline Lucide-style SVGs (`src/components/icons.tsx`) instead of the `lucide-react` package, to avoid an extra dependency.

## Folder structure

```
src/
  game/                    # pure TypeScript, no React — fully unit-testable
    types.ts config.ts rng.ts
    TypingEngine.ts        # input diffing, per-keystroke judging, anti-cheat limits
    WPMCalculator.ts       # WPM formula + RecentWpmTracker (sliding window)
    AccuracyCalculator.ts  # accuracy formula + RollingAccuracy
    RacingPhysics.ts       # WPM+accuracy -> target speed, accel limits, distance integration
    AIDifficultyManager.ts # personalities + calibration to player skill
    AIOpponent.ts          # AI driver (same physics as player)
    OvertakingManager.ts   # stable ranking with hysteresis, overtake events
    RaceStateManager.ts    # RaceEngine: lifecycle, countdown, pause, finish, results
    GameLoop.ts            # idempotent rAF loop wrapper
    createRace.ts texts.ts storage.ts audio.ts
  components/              # GameScreen, RaceTrack, CarSprite (player + AI), TypingPanel, StatsPanel,
                           # ResultsDashboard, ProgressDashboard, SettingsPanel, MenuScreen,
                           # CalibrationScreen, Header, LineChart, PassageText, icons
  App.tsx main.tsx index.css
tests/
  game.test.ts             # Tests 1-7 from the spec (+ calibration properties)
  helpers.ts               # synthetic typist simulator
  fairness.report.ts       # `bun tests/fairness.report.ts` finishing-position distribution
```

## Formulas

**WPM** = (correct characters / 5) / elapsed minutes. "Correct characters" is the length of the error-free prefix of what you typed (cumulative across passages), so wrong characters and characters typed after an error never count until fixed. Average WPM (live and final) is measured from your first keystroke (min. 3 s span). Results also show *Average WPM* = mean of the live windowed WPM, and *Peak WPM* (windowed, after a 3 s warm-up).

**Accuracy** = correct keystrokes / total keystrokes × 100 (every inserted character is one keystroke; Backspace is not).

**Current WPM** (drives the car) = net correct characters gained in the last 4 s ÷ 5 ÷ minutes (span at least 2 s early on), then smoothed with an exponential average (τ = 0.6 s). Idling adds nothing, so the value decays to 0 within ~4 s of stopping. Backspacing correct text lowers it.

**Player speed**
```
ratio   = clamp(WPM / calibratedSkill, 0, 2.2)
bonus   = (refSpeed − baseSpeed) × ratio                (refSpeed 55 m/s, baseSpeed 3 m/s)
accMult = 0.6 + 0.4·clamp((acc − 0.75)/0.25, 0, 1)      (Accuracy Challenge: 0.25 + 0.75·clamp((acc − 0.85)/0.15, 0, 1))
target  = baseSpeed + bonus × accMult
speed  += clamp((target − speed)·2.2, −decel, +accel)·dt     (accel 16 m/s², decel 12 m/s²)
distance += speed × dt                                  (fixed 1/60 s sub-steps, delta-time based)
```
Accuracy uses the last 40 keystrokes with a small prior, so one typo doesn't swing speed. Because WPM is divided by *your* calibrated skill, typing at your own level yields `refSpeed` for everyone. All constants are in `src/game/config.ts`.

Track length = refSpeed × expected duration (Quick 35 s, Classic/Accuracy 70 s, Custom 60 s), so a typist at their calibrated pace and ~perfect accuracy finishes around that time. Text is an endless stream of passages (next passage loads automatically; recent ones are skipped, also across races), so the finish is decided by distance only.

## AI calibration

Each rival: `targetWPM = skill × difficultyScale × personalityRatio × (1 ± 5 % per-race jitter)`.

| Rival | Ratio | Character |
|---|---|---|
| Steady Eddie | 0.82 | consistent, slightly slower, low variation |
| Balanced Bea | 0.93 | balanced |
| Burst Blaze | 1.02 | fast, pace swings in 5-11 s waves |
| Ace Rival | 1.12 | aggressive: strong start, higher acceleration |

Difficulty scale: Easy 0.85, Normal 1.00, Hard 1.12; optional Adaptive mode adds ±4 % per race (max ±20 %) from your results. Each rival has its own target, max WPM, accuracy, acceleration/deceleration, noise (Ornstein–Uhlenbeck), speed, distance and finish state, plus the same warm-up a human has. Skill is set by the 20 s calibration test and then follows your results (75 % old / 25 % new, limited to −20 %/+25 % per race). Difficulty never changes your own WPM/accuracy — it only changes rival targets. Lanes are shuffled each race.

Catch-up assist exists but is **off by default** (Settings): ±5 % max on rival WPM, never moves a car.

## How overtaking works

Every car (player included) only changes position through `distance += speed × dt`. Rendering maps `distance / trackLength` to an x position — nothing else moves a car. `OvertakingManager` ranks cars by distance (finished cars by their interpolated crossing time); a car must lead by more than 2.5 m to be ranked above another, which prevents flicker between side-by-side cars. A pass event is emitted only when the ranking actually flips. The race ends when the player crosses the line; first car over the line is announced as winner; unfinished rivals are listed with their progress.

## Modes

Quick, Classic, Time Trial (30/60/120 s, solo), Accuracy Challenge (stricter accuracy multiplier), Practice (solo, endless, "End practice" button), Custom Text (races rivals using your passage, looped). All are implemented — none are "coming soon".

## Test results

`npm test` (also verified with `bun test`): **29 tests pass**.

* **Test 1 Beginner (15 WPM)** — four distinct rivals at 11-20 WPM, different acceleration profiles; a 16.5-gross-WPM typist at 95 % accuracy finishes 2nd-4th, passes ≥1 rival and is passed by others; no car ever exceeds max speed per frame (no teleporting).
* **Test 2 Intermediate (40 WPM)** — targets scale >2× vs. beginner, rivals are passed at different times, rank order always agrees with distance.
* **Test 3 Advanced (80 WPM)** — rival targets 65-100+ WPM, player reaches >40 m/s and >65 WPM, hard difficulty is not won by a typist at exactly their skill level.
* **Test 4 Speed changes** — 20→60→0→40 WPM schedule: speed rises, drops below 15 m/s after stopping, recovers; a rival gains ground while you slow and loses it when you speed up; max acceleration < 20 m/s².
* **Test 5 Overtaking** — faster car overtakes, reversing speeds reverses the order, exactly one pass event each way; noisy equal-speed cars don't flicker; frame-rate-independent distance.
* **Test 6 Lifecycle** — countdown 3-2-1-GO, pause freezes time, positions and input, resume continues, finish order from real crossing times, Time Trial ends at exactly the limit, Practice ends only manually, new engine is clean (Play Again), `GameLoop` never runs two loops.
* **Test 7 Input** — Backspace, wrong characters, empty input, paste rejected, multi-character injection rejected, key-repeat/speed limiter, 6-char error overrun cap, wrong keys give zero speed credit, Bangla IME commit/composition deferral/NFC normalisation, passage rollover.

Finishing positions for a steady typist who types exactly at their calibrated net speed (40 simulated races each, `tests/fairness.report.ts`):

| skill | difficulty | win % | avg pos | rivals passed |
|---|---|---|---|---|
| 15 | easy / normal / hard | 65 / 10 / 0 | 1.4 / 2.8 / 4.1 | 3.8 / 2.9 / 1.9 |
| 40 | easy / normal / hard | 75 / 0 / 0 | 1.3 / 2.9 / 4.1 | 3.9 / 2.7 / 1.6 |
| 80 | easy / normal / hard | 80 / 0 / 0 | 1.2 / 2.8 / 4.1 | 4.0 / 2.7 / 1.5 |

So at Normal a typist at their calibrated level usually finishes 2nd-3rd and passes about 3 rivals; to win you need to beat your own calibrated speed (or be accurate on a good run). Hard asks for a clear improvement over your calibration.

Also verified in headless Chromium (desktop and 390 px-wide viewport): menu → calibration → countdown → real keyboard typing moves the car → error counting → pause freezes cars → restart → progress page → settings → full race → results dialog → stats saved to `localStorage` → Play again. No console errors.

## Known limitations

* The sandbox this was built in could not reach the npm registry, so `npm install`, the Tailwind/Vite build, `tsc` on the React components and Vitest were **not** run here. The game logic and tests were type-checked with TypeScript and run with Bun; the UI was bundled with Bun and exercised in headless Chromium **without Tailwind CSS compiled**, so layout/styling has not been visually checked. Please run `npm install && npm run build && npm test` and report anything that needs adjusting.
* Bangla: comparison is by NFC-normalised Unicode code points. IME composition is deferred until commit; layouts/IMEs differ (OS keyboards and Avro were not testable here). The passage font depends on system Bengali fonts.
* WPM uses the standard 5-characters-per-word convention for every language, including Bangla and code.
* Custom/pasted passages are normalised to single-spaced text (line breaks → spaces); programming snippets are single-line.
* Skill/WPM calibration measures net speed, so sloppy typing lowers both your calibration and your speed multiplier consistently.
* Audio uses simple WebAudio tones; browsers keep it silent until the first click/keypress.
* Progress is local to one browser; there is no cloud sync or login.
