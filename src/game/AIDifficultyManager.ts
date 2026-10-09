import { DIFFICULTY_SCALE } from './config';
import type { Difficulty } from './types';
import { clamp, rand, shuffle, type Rng } from './rng';

export interface Personality {
  id: string; name: string; color: string; blurb: string;
  ratio: number; // fraction of the player's skill this rival aims for (at Normal)
  accuracy: number; maxBoost: number;
  accelMul: number; decelMul: number;
  variation: number; tau: number; burstAmp: number; startBoost: number;
}

export const PERSONALITIES: Personality[] = [
  { id: 'eddie', name: 'Steady Eddie', color: '#f472b6', blurb: 'Consistent, slightly slower',
    ratio: 0.82, accuracy: 0.985, maxBoost: 1.15, accelMul: 0.9, decelMul: 0.9, variation: 0.035, tau: 3, burstAmp: 0, startBoost: 0 },
  { id: 'bea', name: 'Balanced Bea', color: '#a3e635', blurb: 'Balanced and competitive',
    ratio: 0.93, accuracy: 0.965, maxBoost: 1.25, accelMul: 1, decelMul: 1, variation: 0.06, tau: 2.5, burstAmp: 0, startBoost: 0 },
  { id: 'blaze', name: 'Burst Blaze', color: '#fbbf24', blurb: 'Fast, but pace comes in waves',
    ratio: 1.02, accuracy: 0.945, maxBoost: 1.4, accelMul: 1.1, decelMul: 1.1, variation: 0.1, tau: 1.5, burstAmp: 0.14, startBoost: 0 },
  { id: 'ace', name: 'Ace Rival', color: '#a78bfa', blurb: 'Aggressive and challenging',
    ratio: 1.12, accuracy: 0.955, maxBoost: 1.3, accelMul: 1.25, decelMul: 1, variation: 0.07, tau: 2, burstAmp: 0.05, startBoost: 0.12 },
];

export interface OpponentProfile extends Personality {
  targetWpm: number; maxWpm: number; difficulty: Difficulty;
}

export const difficultyScale = (d: Difficulty, adaptiveOffset = 0) =>
  DIFFICULTY_SCALE[d] * (1 + clamp(adaptiveOffset, -0.2, 0.2));

/**
 * Builds the opponent field relative to the player's calibrated skill.
 * target = skill * difficultyScale * personalityRatio * (1 +/- 5% per-race jitter)
 * so the field moves with the player, keeps its personalities, and differs per race.
 */
export function calibrateOpponents(
  skillWpm: number, difficulty: Difficulty, rng: Rng, adaptiveOffset = 0, count = 4,
): OpponentProfile[] {
  const skill = Math.max(skillWpm, 8);
  const scale = difficultyScale(difficulty, adaptiveOffset);
  return PERSONALITIES.slice(0, count).map((p) => {
    const jitter = 1 + rand(rng, -0.05, 0.05);
    const targetWpm = Math.max(6, skill * scale * p.ratio * jitter);
    return {
      ...p, difficulty, targetWpm, maxWpm: targetWpm * p.maxBoost,
      variation: p.variation * rand(rng, 0.85, 1.15),
    };
  });
}

export const assignLanes = (n: number, rng: Rng) => shuffle(Array.from({ length: n }, (_, i) => i), rng);
