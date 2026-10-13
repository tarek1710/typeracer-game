export type Difficulty = 'easy' | 'normal' | 'hard';
export type GameMode = 'quick' | 'classic' | 'timetrial' | 'accuracy' | 'practice' | 'custom';
export type Category =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'professional'
  | 'programming'
  | 'bangla'
  | 'custom';
export type CarKind = 'van' | 'hatch' | 'coupe' | 'racer' | 'player';
export type RacePhase = 'idle' | 'countdown' | 'racing' | 'paused' | 'finished';

export interface PhysicsParams {
  baseSpeed: number; // m/s a car has with zero typing bonus
  refWpm: number; // WPM that produces refSpeed (absolute scale, same for every car)
  refSpeed: number; // m/s at refWpm with perfect accuracy
  maxRatio: number; // cap on (wpm / skill)
  accel: number; // m/s^2 limit
  decel: number; // m/s^2 limit
  response: number; // 1/s, how aggressively speed chases target
}

export interface ModeConfig {
  id: GameMode;
  label: string;
  description: string;
  opponents: boolean;
  end: 'distance' | 'time' | 'manual';
  /** expected race duration (s) for a typist at calibrated skill; sets track length */
  duration: number;
  strictAccuracy: boolean;
  shortText: boolean;
}

/** One car on the track. The same shape is used for the player and for AI cars. */
export interface CarState {
  id: string;
  name: string;
  color: string;
  isPlayer: boolean;
  kind: CarKind;
  tag: string; // e.g. "40 WPM" for rivals
  lane: number;
  distance: number; // metres travelled, integrated from speed
  speed: number; // m/s
  targetSpeed: number;
  currentWpm: number;
  finished: boolean;
  finishTime: number | null;
  finishRank: number | null;
}

export interface RaceConfig {
  mode: GameMode;
  category: Category;
  difficulty: Difficulty;
  customText?: string;
  timeLimit?: number;
  seed?: number;
  catchUp?: boolean;
}

export interface PerformanceMetrics {
  currentWpm: number;
  averageWpm: number;
  peakWpm: number;
  accuracy: number; // 0..100
  errors: number;
  correctChars: number;
  totalKeystrokes: number;
  passageProgress: number; // 0..100 of current passage
  remainingChars: number;
}

export interface Standing {
  id: string;
  name: string;
  color: string;
  isPlayer: boolean;
  rank: number;
  finished: boolean;
  finishTime: number | null;
  progressPct: number;
}

export interface RaceResult {
  mode: GameMode;
  category: Category;
  difficulty: Difficulty;
  reason: 'finish' | 'time' | 'manual';
  finalPosition: number;
  totalCars: number;
  winnerName: string;
  playerWon: boolean;
  finalWpm: number;
  averageWpm: number;
  peakWpm: number;
  accuracy: number;
  errors: number;
  correctChars: number;
  totalKeystrokes: number;
  duration: number;
  overtakes: number;
  uniqueOvertaken: number;
  distance: number;
  standings: Standing[];
  timestamp: number;
}
