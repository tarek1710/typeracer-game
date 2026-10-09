// Run: bun tests/fairness.report.ts   -> finishing-position distribution per skill level / difficulty
import { makeRace, simulate } from './helpers';
import type { Difficulty } from '../src/game/types';

const skills = [15, 40, 80];
const diffs: Difficulty[] = ['easy', 'normal', 'hard'];
const N = 40;
console.log('skill  difficulty  win%  avgPos  pos1 pos2 pos3 pos4 pos5   avg opponents passed');
for (const skill of skills) for (const d of diffs) {
  const pos = [0, 0, 0, 0, 0]; let passed = 0, sum = 0;
  for (let s = 1; s <= N; s++) {
    const e = makeRace(skill, { difficulty: d, seed: s * 7919, mode: 'classic' });
    simulate(e, { wpm: () => skill * 1.1, accuracy: 0.95, seed: s });
    const r = e.result!; pos[r.finalPosition - 1]++; sum += r.finalPosition; passed += r.uniqueOvertaken;
  }
  console.log(`${String(skill).padEnd(6)} ${d.padEnd(11)} ${String(Math.round((pos[0] / N) * 100)).padStart(3)}%  ${(sum / N).toFixed(2)}   ${pos.map((p) => String(p).padStart(4)).join(' ')}   ${(passed / N).toFixed(2)}`);
}
