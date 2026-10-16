# TypeRacer — Typing Speed Racing Game

Type to drive. Your recent typing speed and accuracy set your car's speed; the car's position is the integral of its speed. You race against four rivals who run at **fixed WPM** for the chosen text level. If you stop typing, your car stops.

## Install & run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # simulation tests (Vitest)
npm run build      # type-check + production build -> dist/
npm run build:single   # optional: one self-contained HTML file -> dist-single/
```

Node 18+. Stack: React 18, TypeScript, Vite, Tailwind CSS 3, `requestAnimationFrame` loop, DOM track, `localStorage`.

## Race screen

The race screen is full screen (no header): the track fills the screen, the text to type sits along the bottom with the following passages queued below it one after another, and the controls (menu, pause/resume, restart, sound, end practice) are stacked at the bottom-left. Typing goes through a hidden, always-focused input. Each car shows its live position, name and, for rivals, its WPM. WPM/accuracy/errors/overtakes are shown in the results dialog and the progress page.

## Cars

5 cars in every mode except Practice (solo): you + 4 rivals, each with a different body style — van (slowest), hatchback, coupe, open-wheel racer (fastest) — and you drive the striped rally car.

| Text level | Rival WPM (slowest → fastest) |
|---|---|
| Beginner (also Bangla) | 10 · 20 · 30 · 40 |
| Intermediate (also Programming, Custom) | 20 · 40 · 60 · 80 |
| Advanced (also Professional) | 40 · 60 · 80 · 100 |

(Table lives in `src/game/config.ts` → `RIVAL_WPM`, `CATEGORY_TIER`.) Rivals have small in-race pace noise (±4–8 %), their own acceleration, and personalities (steady, balanced, bursty, fast starter). Lanes are shuffled every race. There is no difficulty setting any more.

## Formulas

**WPM** = (correct characters / 5) / minutes. Correct characters = the error-free prefix of what you typed (cumulative over passages).
**Accuracy** = correct keystrokes / total keystrokes × 100.
**Current WPM** (drives the car) = net correct characters in the last 3 s ÷ 5 ÷ minutes, smoothed (τ = 0.25 s). If you make no correct keystroke for 0.8 s it fades to 0 over the next 0.5 s.

**Speed (same for you and every rival):**
```
ratio   = clamp(WPM / 60, 0, 2.2)
accMult = 0.6 + 0.4·clamp((acc − 0.75)/0.25, 0, 1)     (Accuracy Challenge: 0.25 + 0.75·clamp((acc − 0.85)/0.15, 0, 1))
target  = 55 m/s × ratio × accMult                     (base speed = 0: not typing = standing still)
speed  += clamp((target − speed)·2.2, −30, +16)·dt     (acceleration / braking limits)
distance += speed × dt
```
Rivals use acc = 1, so a "40 WPM" rival moves exactly like a perfect 40 WPM typist. Positions only change through `distance += speed × dt`, so overtaking is purely speed and distance (ranking has a 2.5 m hysteresis against flicker).

Track length = the distance a typist at the average rival speed of that level covers in the mode's time (Quick 35 s, Classic/Accuracy 70 s, Custom 60 s). Time Trial (30/60/120 s) runs against the rivals for a fixed time; Practice is solo and ends with the button.

## Tests

`npm test` → 31 tests (also run with Bun). They cover: fixed rival WPM per level, 5 distinct cars, rivals' measured speed within ±15 % of their WPM, beginner/intermediate/advanced typists overtaking and being overtaken, **car standing still before typing and stopping when typing stops**, speed changes, overtaking both ways without teleporting, countdown/pause/resume/finish/play again, GameLoop (no duplicate loops), Backspace, wrong keys, empty input, paste, key repeat, Bangla IME input. Average finishing position of a steady typist at 97 % accuracy (20 simulated races each):

```
level          typist WPM   avg position   win%   avg rivals passed
beginner             10         5.00      0%   0.00
beginner             15         4.00      0%   1.00
beginner             25         3.00      0%   2.00
beginner             35         2.25      0%   1.90
beginner             45         1.55     45%   2.60
intermediate         15         5.00      0%   0.00
intermediate         30         4.00      0%   1.00
intermediate         45         3.20      0%   1.85
intermediate         65         2.60      0%   2.70
intermediate         85         1.95      5%   2.80
advanced             30         5.00      0%   0.00
advanced             50         4.00      0%   1.00
advanced             70         3.05      0%   2.00
advanced             90         2.25      0%   3.00
advanced            110         1.90     10%   3.30
```

## Known limitations

* The environment this was built in could not reach the npm registry, so `npm install`, the Tailwind/Vite build, `tsc` on the React components and Vitest were **not** run there. Game logic was type-checked with TypeScript and tested with Bun; the UI was bundled with Bun and driven in headless Chromium **without compiled Tailwind CSS**, so the layout has not been visually checked. Please run `npm install && npm run build && npm test`. (`noUnusedLocals` is off in `tsconfig.json` for that reason.)
* Bangla: compared as NFC-normalised Unicode code points, IME input counted when committed; layouts/IMEs differ and were not tested with a real IME.
* WPM uses 5 characters per word for every language.
* Progress is local to one browser; no login or cloud sync.
