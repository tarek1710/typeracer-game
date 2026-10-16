import { RaceEngine } from './RaceStateManager';
import { MODES } from './config';
import { mulberry32 } from './rng';
import { createPassageProvider } from './texts';
import type { RaceConfig } from './types';

export interface CreateRaceDeps { passageProvider?: () => string; persistRecent?: boolean }

/** Factory used by the UI and tests: builds a fresh, fully independent race. */
export function createRace(config: RaceConfig, deps: CreateRaceDeps = {}): RaceEngine {
  const seed = config.seed ?? (Math.random() * 2 ** 32) >>> 0;
  const rng = mulberry32(seed);
  const category = config.mode === 'custom' ? 'custom' : config.category;
  const provider = deps.passageProvider ?? createPassageProvider(category, rng, {
    customText: config.customText, shortOnly: MODES[config.mode].shortText, persist: deps.persistRecent,
  });
  return new RaceEngine({ ...config, category }, provider, rng);
}
