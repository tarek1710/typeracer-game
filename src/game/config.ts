import type { Difficulty, GameMode, ModeConfig, PhysicsParams } from './types';

/** Every tunable number of the simulation lives here. */
export const PHYSICS: PhysicsParams = {
  baseSpeed: 3,
  refSpeed: 55,
  maxRatio: 2.2,
  accel: 16,
  decel: 12,
  response: 2.2,
};

export const TYPING = {
  windowSec: 4, // recent-performance window
  minSpan: 2, // avoid huge WPM spikes in the first seconds
  smoothTau: 0.6, // EMA time constant (s) applied before physics
  minKeyInterval: 0.012, // s; faster inserts are treated as artificial
  maxOverrun: 6, // chars allowed to be typed past the first error
  accuracyWindow: 40,
  accuracyPrior: 8,
  peakWarmup: 3,
  avgMinSpan: 3,
  maxChunk: 8, // max chars from one IME commit
};

export const RACE = { countdown: 3, step: 1 / 60, maxFrame: 0.1 };
export const OVERTAKE = { hysteresis: 2.5, minDistance: 15 };

export const DIFFICULTY_SCALE: Record<Difficulty, number> = { easy: 0.85, normal: 1, hard: 1.12 };

export const CATCH_UP = { strength: 0.5, cap: 0.05 };

export const MODES: Record<GameMode, ModeConfig> = {
  quick: {
    id: 'quick', label: 'Quick Race', description: 'Short sprint against four rivals.',
    opponents: true, end: 'distance', duration: 35, strictAccuracy: false, shortText: true,
  },
  classic: {
    id: 'classic', label: 'Classic Race', description: 'Full race against four different rivals.',
    opponents: true, end: 'distance', duration: 70, strictAccuracy: false, shortText: false,
  },
  timetrial: {
    id: 'timetrial', label: 'Time Trial', description: 'Type for 30, 60 or 120 seconds.',
    opponents: false, end: 'time', duration: 60, strictAccuracy: false, shortText: false,
  },
  accuracy: {
    id: 'accuracy', label: 'Accuracy Challenge', description: 'Mistakes slow you down much more.',
    opponents: true, end: 'distance', duration: 70, strictAccuracy: true, shortText: false,
  },
  practice: {
    id: 'practice', label: 'Practice', description: 'No rivals, no pressure. End whenever you like.',
    opponents: false, end: 'manual', duration: 60, strictAccuracy: false, shortText: false,
  },
  custom: {
    id: 'custom', label: 'Custom Text', description: 'Race against rivals using your own passage.',
    opponents: true, end: 'distance', duration: 60, strictAccuracy: false, shortText: false,
  },
};
