import { CATEGORY_TIER, RIVAL_WPM } from './config';
import type { CarKind, Category } from './types';
import { rand, shuffle, type Rng } from './rng';

export interface Personality {
  id: string; name: string; color: string; blurb: string; kind: CarKind;
  maxBoost: number; accelMul: number; decelMul: number;
  variation: number; tau: number; burstAmp: number; startBoost: number;
}

/** Slowest to fastest. The slot index picks the rival's WPM from RIVAL_WPM. */
export const PERSONALITIES: Personality[] = [
  { id: 'eddie', name: 'Steady Eddie', color: '#f472b6', blurb: 'Consistent, slow', kind: 'van',
    maxBoost: 1.15, accelMul: 0.8, decelMul: 0.9, variation: 0.035, tau: 3, burstAmp: 0, startBoost: 0 },
  { id: 'bea', name: 'Balanced Bea', color: '#a3e635', blurb: 'Balanced', kind: 'hatch',
    maxBoost: 1.25, accelMul: 0.95, decelMul: 1, variation: 0.06, tau: 2.5, burstAmp: 0, startBoost: 0 },
  { id: 'blaze', name: 'Burst Blaze', color: '#fbbf24', blurb: 'Fast, pace comes in waves', kind: 'coupe',
    maxBoost: 1.35, accelMul: 1.1, decelMul: 1.1, variation: 0.08, tau: 1.5, burstAmp: 0.1, startBoost: 0 },
  { id: 'ace', name: 'Ace Rival', color: '#a78bfa', blurb: 'Aggressive and quick off the line', kind: 'racer',
    maxBoost: 1.25, accelMul: 1.3, decelMul: 1, variation: 0.06, tau: 2, burstAmp: 0.04, startBoost: 0.1 },
];

export interface OpponentProfile extends Personality { targetWpm: number; maxWpm: number }

export const rivalWpms = (category: Category) => RIVAL_WPM[CATEGORY_TIER[category]];

/** Four rivals at fixed WPM for the category level; only small in-race pace variation differs per race. */
export function calibrateOpponents(category: Category, rng: Rng, count = 4): OpponentProfile[] {
  const wpms = rivalWpms(category);
  return PERSONALITIES.slice(0, count).map((p, i) => ({
    ...p, targetWpm: wpms[i], maxWpm: wpms[i] * p.maxBoost, variation: p.variation * rand(rng, 0.85, 1.15),
  }));
}

export const assignLanes = (n: number, rng: Rng) => shuffle(Array.from({ length: n }, (_, i) => i), rng);
