import { createRace } from '../src/game/createRace';
import { mulberry32 } from '../src/game/rng';
import { maxSpeed } from '../src/game/RacingPhysics';
import type { RaceEngine } from '../src/game/RaceStateManager';
import type { Category, GameMode, RaceConfig } from '../src/game/types';

export function makeRace(o: Partial<RaceConfig> & { category?: Category; mode?: GameMode } = {}) {
  const cfg: RaceConfig = { mode: 'classic', category: 'intermediate', difficulty: 'normal', seed: 1234, ...o };
  return createRace(cfg, { persistRecent: false });
}

export interface SimOpts {
  wpm: (t: number) => number; // typing speed schedule by race time
  accuracy?: number; // probability each keystroke is right
  seed?: number;
  maxTime?: number;
  onStep?: (e: RaceEngine, t: number) => void;
}

/** Plays a whole race with a synthetic typist; also asserts no car ever jumps (teleports). */
export function simulate(e: RaceEngine, o: SimOpts) {
  const rng = mulberry32(o.seed ?? 7);
  const acc = o.accuracy ?? 1;
  const dt = 1 / 60;
  e.startCountdown();
  while (e.phase === 'countdown') e.update(dt);
  let carry = 0;
  let value = '';
  let wrongPending = false;
  const vmax = maxSpeed() * 1.02;
  let maxJump = 0;
  const last = new Map(e.cars.map((c) => [c.id, c.distance]));
  const maxTime = o.maxTime ?? 600;

  while (e.phase === 'racing' && e.time < maxTime) {
    e.update(dt);
    carry += (o.wpm(e.time) * 5) / 60 * dt;
    while (carry >= 1) {
      carry -= 1;
      if (wrongPending) {
        value = value.slice(0, -1); wrongPending = false;
      } else if (rng() > acc) {
        value += 'ÿ'; wrongPending = true;
      } else {
        value += e.typing.expectedChar() ?? '';
      }
      const r = e.typeInput(value, {}, e.time + carry * 1e-4);
      value = r.value;
      if (r.passageCompleted) wrongPending = false;
    }
    for (const c of e.cars) {
      const jump = c.distance - (last.get(c.id) ?? 0);
      maxJump = Math.max(maxJump, jump / dt);
      last.set(c.id, c.distance);
    }
    o.onStep?.(e, e.time);
  }
  return { maxSpeedSeen: maxJump, vmax };
}
