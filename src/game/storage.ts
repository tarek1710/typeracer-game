import type { Difficulty, RaceResult } from './types';

export interface RaceRecord {
  t: number; mode: string; category: string; difficulty: Difficulty;
  wpm: number; accuracy: number; position: number; cars: number; won: boolean; duration: number;
}
export interface Progress {
  version: 1;
  totalRaces: number; wins: number; wpmSum: number; bestWpm: number; bestAccuracy: number;
  personalBest: { wpm: number; accuracy: number; t: number; mode: string } | null;
  races: RaceRecord[];
  skillWpm: number | null; adaptiveOffset: number;
}
export interface Settings {
  sound: boolean; adaptive: boolean; catchUp: boolean; difficulty: Difficulty;
}

const PKEY = 'typeracer.progress.v1';
const SKEY = 'typeracer.settings.v1';

export const defaultProgress = (): Progress => ({
  version: 1, totalRaces: 0, wins: 0, wpmSum: 0, bestWpm: 0, bestAccuracy: 0,
  personalBest: null, races: [], skillWpm: null, adaptiveOffset: 0,
});
export const defaultSettings = (): Settings => ({ sound: true, adaptive: false, catchUp: false, difficulty: 'normal' });

function read<T>(key: string, fallback: () => T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback(), ...JSON.parse(raw) } : fallback();
  } catch { return fallback(); }
}
function write(key: string, v: unknown) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ } }

export const loadProgress = () => read(PKEY, defaultProgress);
export const saveProgress = (p: Progress) => write(PKEY, p);
export const loadSettings = () => read(SKEY, defaultSettings);
export const saveSettings = (s: Settings) => write(SKEY, s);

export function resetProgress(): Progress {
  const keep = loadProgress().skillWpm;
  const p = { ...defaultProgress(), skillWpm: keep };
  saveProgress(p);
  return p;
}

export function setSkill(wpm: number): Progress {
  const p = loadProgress();
  p.skillWpm = Math.max(8, Math.round(wpm));
  saveProgress(p);
  return p;
}

/** Records a finished race, refreshes calibrated skill from recent performance, and nudges adaptive offset. */
export function recordRace(r: RaceResult, adaptive: boolean): Progress {
  const p = loadProgress();
  const meaningful = r.duration >= 10 && r.totalKeystrokes >= 10;
  if (meaningful) {
    p.totalRaces++;
    if (r.playerWon && r.totalCars > 1) p.wins++;
    p.wpmSum += r.finalWpm;
    p.bestWpm = Math.max(p.bestWpm, r.finalWpm);
    p.bestAccuracy = Math.max(p.bestAccuracy, r.accuracy);
    if (!p.personalBest || r.finalWpm > p.personalBest.wpm) {
      p.personalBest = { wpm: r.finalWpm, accuracy: r.accuracy, t: r.timestamp, mode: r.mode };
    }
    p.races.push({
      t: r.timestamp, mode: r.mode, category: r.category, difficulty: r.difficulty,
      wpm: r.finalWpm, accuracy: r.accuracy, position: r.finalPosition, cars: r.totalCars,
      won: r.playerWon, duration: r.duration,
    });
    p.races = p.races.slice(-200);
    if (r.duration >= 15 && r.accuracy >= 85 && r.finalWpm > 0) {
      // Blend toward recent performance, but move at most -20% / +25% per race so one outlier can't wreck calibration.
      const prev = p.skillWpm ?? r.finalWpm;
      const blended = 0.75 * prev + 0.25 * r.finalWpm;
      p.skillWpm = Math.max(8, Math.round(Math.min(prev * 1.25, Math.max(prev * 0.8, blended))));
    }
    if (adaptive && r.totalCars > 1) {
      if (r.finalPosition === 1) p.adaptiveOffset += 0.04;
      else if (r.finalPosition >= r.totalCars - 1) p.adaptiveOffset -= 0.04;
      else p.adaptiveOffset *= 0.8;
      p.adaptiveOffset = Math.max(-0.2, Math.min(0.2, p.adaptiveOffset));
    }
  }
  saveProgress(p);
  return p;
}
