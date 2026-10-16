// Run: bun tests/fairness.report.ts -> where a steady typist finishes at each level
import { makeRace, simulate } from './helpers';
import type { Category } from '../src/game/types';

const levels: [Category, number[]][] = [
  ['beginner', [10, 15, 25, 35, 45]],
  ['intermediate', [15, 30, 45, 65, 85]],
  ['advanced', [30, 50, 70, 90, 110]],
];
const N = 20;
console.log('level          typist WPM   avg position   win%   avg rivals passed');
for (const [cat, wpms] of levels) for (const w of wpms) {
  let sum = 0, wins = 0, passed = 0;
  for (let s = 1; s <= N; s++) {
    const e = makeRace({ category: cat, seed: s * 7919, mode: 'classic' });
    simulate(e, { wpm: () => w, accuracy: 0.97, seed: s, maxTime: 600 });
    const r = e.result ?? (e.finishNow(), e.result!);
    sum += r.finalPosition; wins += r.finalPosition === 1 ? 1 : 0; passed += r.uniqueOvertaken;
  }
  console.log(`${cat.padEnd(14)} ${String(w).padStart(8)}   ${(sum / N).toFixed(2).padStart(10)}   ${String(Math.round((wins / N) * 100)).padStart(4)}%   ${(passed / N).toFixed(2)}`);
}
