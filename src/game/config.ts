import type { Category, Difficulty, GameMode, ModeConfig, PhysicsParams } from './types';

/** Every tunable number of the simulation lives here. */
export const PHYSICS: PhysicsParams = {
  baseSpeed: 0,
  refWpm: 60, // absolute scale: 60 WPM = 55 m/s for the player AND every rival
  refSpeed: 55,
  maxRatio: 2.2,
  accel: 16,
  decel: 30,
  response: 2.2,
};

export const TYPING = {
  windowSec: 3, // recent-performance window
  idleGrace: 0.8, // s without a correct key before the car starts to lose its bonus
  idleFade: 0.5, // s over which the bonus fades to zero once idle
  minSpan: 2, // avoid huge WPM spikes in the first seconds
  smoothTau: 0.25, // EMA time constant (s) applied before physics
  minKeyInterval: 0.012, // s; faster inserts are treated as artificial
  maxOverrun: 6, // chars allowed to be typed past the first error
  accuracyWindow: 40,
  accuracyPrior: 8,
  peakWarmup: 3,
  avgMinSpan: 3,
  maxChunk: 8, // max chars from one IME commit
};

/** Rival speeds (WPM) per text level, slowest to fastest. Fixed, independent of the player. */
export const RIVAL_WPM = {
  beginner: [10, 20, 30, 40],
  intermediate: [20, 40, 60, 80],
  advanced: [40, 60, 80, 100],
} as const;

export const CATEGORY_TIER: Record<Category, keyof typeof RIVAL_WPM> = {
  beginner: 'beginner', bangla: 'beginner',
  intermediate: 'intermediate', programming: 'intermediate', custom: 'intermediate',
  advanced: 'advanced', professional: 'advanced',
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
    opponents: true, end: 'time', duration: 60, strictAccuracy: false, shortText: false,
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
