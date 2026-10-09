import { CATCH_UP, MODES, PHYSICS, RACE, TYPING } from './config';
import { accuracyPercent, RollingAccuracy } from './AccuracyCalculator';
import { AIOpponent } from './AIOpponent';
import { assignLanes, calibrateOpponents } from './AIDifficultyManager';
import { OvertakingManager, type OvertakeEvent } from './OvertakingManager';
import { integrate, stepSpeed, targetSpeed } from './RacingPhysics';
import { clamp, type Rng } from './rng';
import { TypingEngine, type InputFlags, type InputResult } from './TypingEngine';
import { RecentWpmTracker, wpmFromChars } from './WPMCalculator';
import type {
  CarState, ModeConfig, PerformanceMetrics, RaceConfig, RacePhase, RaceResult, Standing,
} from './types';

export interface RaceEvents {
  countdown: number;
  start: undefined;
  overtake: OvertakeEvent;
  carFinished: CarState;
  winner: CarState;
  end: RaceResult;
  phase: RacePhase;
  passage: string;
  keystroke: InputResult;
}

export interface RankedCar {
  id: string; name: string; color: string; isPlayer: boolean; rank: number;
  progress: number; wpm: number; speedKmh: number; finished: boolean;
}

export interface RaceSnapshot {
  phase: RacePhase; time: number; countdown: number; timeLeft: number | null;
  metrics: PerformanceMetrics; ranking: RankedCar[]; playerRank: number; totalCars: number;
  overtakes: number; uniqueOvertaken: number; winnerName: string | null;
  progressPct: number; distance: number; trackLength: number; speedKmh: number;
  result: RaceResult | null;
}

const PLAYER_COLOR = '#22d3ee';

/**
 * The whole race simulation. It owns no timers: the UI calls update(dt) from a
 * requestAnimationFrame loop (tests call it directly). Time only advances inside
 * update(), so pausing simply means not advancing it.
 */
export class RaceEngine {
  readonly modeCfg: ModeConfig;
  readonly trackLength: number;
  readonly cars: CarState[] = [];
  readonly player: CarState;
  readonly opponents: AIOpponent[] = [];
  readonly typing: TypingEngine;
  readonly tracker = new RecentWpmTracker();
  readonly rolling = new RollingAccuracy();
  readonly overtaking: OvertakingManager;

  phase: RacePhase = 'idle';
  time = 0;
  countdownLeft = RACE.countdown;
  smoothedWpm = 0;
  recentWpm = 0;
  peakWpm = 0;
  firstKeyTime: number | null = null;
  winnerId: string | null = null;
  result: RaceResult | null = null;
  overtakeEvents: OvertakeEvent[] = [];
  private passed = new Set<string>();
  private wpmIntegral = 0;
  private wpmTime = 0;
  private finishCount = 0;
  private pausedFrom: 'countdown' | 'racing' = 'racing';
  private listeners: Partial<Record<keyof RaceEvents, Set<(p: never) => void>>> = {};

  constructor(readonly config: RaceConfig, private nextPassage: () => string, rng: Rng) {
    this.modeCfg = MODES[config.mode];
    const duration = config.mode === 'timetrial' ? config.timeLimit ?? 60 : this.modeCfg.duration;
    this.trackLength = PHYSICS.refSpeed * duration;

    const profiles = this.modeCfg.opponents
      ? calibrateOpponents(config.skillWpm, config.difficulty, rng, config.adaptiveOffset ?? 0)
      : [];
    const lanes = assignLanes(profiles.length, rng);
    const total = profiles.length + 1;
    const playerLane = Math.floor(total / 2);
    const freeLanes = Array.from({ length: total }, (_, i) => i).filter((i) => i !== playerLane);

    const blank = (id: string, name: string, color: string, isPlayer: boolean, lane: number): CarState => ({
      id, name, color, isPlayer, lane, distance: 0, speed: 0, targetSpeed: 0, currentWpm: 0,
      finished: false, finishTime: null, finishRank: null,
    });
    this.player = blank('player', 'You', PLAYER_COLOR, true, playerLane);
    this.cars.push(this.player);
    profiles.forEach((pr, i) => {
      const car = blank(pr.id, pr.name, pr.color, false, freeLanes[lanes[i]]);
      this.cars.push(car);
      this.opponents.push(new AIOpponent(pr, car, rng, config.skillWpm, this.modeCfg.strictAccuracy));
    });
    this.typing = new TypingEngine(nextPassage());
    this.overtaking = new OvertakingManager(this.cars);
  }

  // ---- events ----
  on<K extends keyof RaceEvents>(ev: K, cb: (p: RaceEvents[K]) => void): () => void {
    const set = (this.listeners[ev] ??= new Set()) as Set<(p: RaceEvents[K]) => void>;
    set.add(cb);
    return () => { set.delete(cb); };
  }
  private emit<K extends keyof RaceEvents>(ev: K, payload: RaceEvents[K]) {
    (this.listeners[ev] as Set<(p: RaceEvents[K]) => void> | undefined)?.forEach((cb) => cb(payload));
  }
  dispose() { this.listeners = {}; }

  private setPhase(p: RacePhase) { this.phase = p; this.emit('phase', p); }

  // ---- lifecycle ----
  startCountdown() {
    if (this.phase !== 'idle') return;
    this.countdownLeft = RACE.countdown;
    this.setPhase('countdown');
    this.emit('countdown', RACE.countdown);
  }

  pause() {
    if (this.phase === 'racing' || this.phase === 'countdown') {
      this.pausedFrom = this.phase;
      this.setPhase('paused');
    }
  }
  resume() { if (this.phase === 'paused') this.setPhase(this.pausedFrom); }

  /** Manual end (Practice mode, or giving up). */
  finishNow() { if (this.phase === 'racing' || this.phase === 'paused') this.endRace('manual'); }

  update(dtIn: number) {
    const dt = Math.min(Math.max(dtIn, 0), RACE.maxFrame * 2.5);
    if (this.phase === 'countdown') {
      const before = Math.ceil(this.countdownLeft);
      this.countdownLeft -= dt;
      const after = Math.ceil(this.countdownLeft);
      if (this.countdownLeft <= 0) { this.countdownLeft = 0; this.time = 0; this.setPhase('racing'); this.emit('start', undefined); }
      else if (after !== before) this.emit('countdown', after);
      return;
    }
    if (this.phase !== 'racing') return;
    let remaining = dt;
    while (remaining > 1e-9 && this.phase === 'racing') {
      let h = Math.min(remaining, RACE.step);
      if (this.modeCfg.end === 'time') h = Math.min(h, (this.config.timeLimit ?? 60) - this.time);
      this.step(h);
      remaining -= h;
    }
  }

  private step(h: number) {
    this.time += h;
    const p = this.player;

    // player: recent typing -> smoothed WPM -> target speed -> rate-limited speed -> distance
    this.recentWpm = this.tracker.recentWpm(this.time);
    this.smoothedWpm += (this.recentWpm - this.smoothedWpm) * (1 - Math.exp(-h / TYPING.smoothTau));
    p.currentWpm = this.smoothedWpm;
    p.targetSpeed = targetSpeed(this.smoothedWpm, this.config.skillWpm, this.rolling.value(), this.modeCfg.strictAccuracy);
    const prev = new Map<string, number>([[p.id, p.distance]]);
    if (!p.finished) {
      p.speed = stepSpeed(p.speed, p.targetSpeed, h);
      p.distance = integrate(p.distance, p.speed, h);
    }
    for (const ai of this.opponents) {
      if (ai.car.finished) continue;
      prev.set(ai.car.id, ai.car.distance);
      let mult = 1;
      if (this.config.catchUp) {
        const gap = (ai.car.distance - p.distance) / this.trackLength;
        mult = 1 - clamp(gap * CATCH_UP.strength, -CATCH_UP.cap, CATCH_UP.cap);
      }
      ai.update(this.time, h, mult);
    }

    if (this.time >= TYPING.peakWarmup) this.peakWpm = Math.max(this.peakWpm, this.recentWpm);
    if (this.time >= 2) { this.wpmIntegral += this.recentWpm * h; this.wpmTime += h; }

    if (this.modeCfg.end === 'distance') {
      for (const c of this.cars) {
        const d0 = prev.get(c.id);
        if (c.finished || d0 === undefined || c.distance < this.trackLength) continue;
        const f = (this.trackLength - d0) / (c.distance - d0);
        c.finished = true;
        c.finishTime = this.time - h + f * h;
        c.finishRank = ++this.finishCount;
        c.distance = this.trackLength;
        this.emit('carFinished', c);
        if (!this.winnerId) { this.winnerId = c.id; this.emit('winner', c); }
      }
    }

    for (const ev of this.overtaking.update(this.cars, this.time)) {
      this.overtakeEvents.push(ev);
      if (ev.passerId === 'player') this.passed.add(ev.passedId);
      this.emit('overtake', ev);
    }

    if (this.modeCfg.end === 'distance' && p.finished) this.endRace('finish');
    else if (this.modeCfg.end === 'time' && this.time >= (this.config.timeLimit ?? 60) - 1e-9) this.endRace('time');
  }

  // ---- typing ----
  typeInput(value: string, flags: InputFlags = {}, now = this.time): InputResult {
    if (this.phase !== 'racing') return this.typing.noop();
    const res = this.typing.applyInput(value, now, flags);
    if (res.accepted > 0 || res.backspaces > 0) {
      if (this.firstKeyTime === null && res.accepted > 0) this.firstKeyTime = this.time;
      for (const k of res.keystrokes) this.rolling.push(k);
      if (res.passageCompleted) {
        const next = this.nextPassage();
        this.typing.rollover(next);
        res.value = '';
        this.emit('passage', next);
      }
      this.tracker.record(this.time, this.typing.progressChars);
      this.emit('keystroke', res);
    }
    return res;
  }

  // ---- read side ----
  metrics(): PerformanceMetrics {
    const elapsed = this.firstKeyTime === null ? 0 : Math.max(this.time - this.firstKeyTime, TYPING.avgMinSpan);
    const t = this.typing;
    return {
      currentWpm: this.smoothedWpm,
      averageWpm: wpmFromChars(t.progressChars, elapsed),
      peakWpm: this.peakWpm,
      accuracy: accuracyPercent(t.correctKeystrokes, t.totalKeystrokes),
      errors: t.errors,
      correctChars: t.progressChars,
      totalKeystrokes: t.totalKeystrokes,
      passageProgress: t.passagePercent,
      remainingChars: t.remaining,
    };
  }

  progressOf(c: CarState) { return clamp(c.distance / this.trackLength, 0, 1); }

  standings(): Standing[] {
    const sorted = this.cars.slice().sort((a, b) => {
      if (a.finished && b.finished) return (a.finishTime ?? 0) - (b.finishTime ?? 0);
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.distance - a.distance;
    });
    return sorted.map((c, i) => ({
      id: c.id, name: c.name, color: c.color, isPlayer: c.isPlayer, rank: i + 1,
      finished: c.finished, finishTime: c.finishTime, progressPct: this.progressOf(c) * 100,
    }));
  }

  getSnapshot(): RaceSnapshot {
    const rank = (id: string) => this.overtaking.rankOf(id);
    const ranking: RankedCar[] = this.cars
      .map((c) => ({
        id: c.id, name: c.name, color: c.color, isPlayer: c.isPlayer, rank: rank(c.id),
        progress: this.progressOf(c) * 100, wpm: c.currentWpm, speedKmh: c.speed * 3.6, finished: c.finished,
      }))
      .sort((a, b) => a.rank - b.rank);
    return {
      phase: this.phase, time: this.time, countdown: Math.ceil(this.countdownLeft),
      timeLeft: this.modeCfg.end === 'time' ? Math.max(0, (this.config.timeLimit ?? 60) - this.time) : null,
      metrics: this.metrics(), ranking, playerRank: rank('player'), totalCars: this.cars.length,
      overtakes: this.overtakeEvents.filter((e) => e.passerId === 'player').length,
      uniqueOvertaken: this.passed.size,
      winnerName: this.winnerId ? this.cars.find((c) => c.id === this.winnerId)!.name : null,
      progressPct: this.progressOf(this.player) * 100, distance: this.player.distance,
      trackLength: this.trackLength, speedKmh: this.player.speed * 3.6, result: this.result,
    };
  }

  private endRace(reason: RaceResult['reason']) {
    if (this.phase === 'finished') return;
    const standings = this.standings();
    const m = this.metrics();
    const me = standings.find((s) => s.isPlayer)!;
    const winner = this.winnerId ? this.cars.find((c) => c.id === this.winnerId)! : null;
    const duration = this.player.finishTime ?? this.time;
    const elapsed = this.firstKeyTime === null ? 0 : Math.max(duration - this.firstKeyTime, TYPING.avgMinSpan);
    this.result = {
      mode: this.config.mode, category: this.config.category, difficulty: this.config.difficulty, reason,
      finalPosition: me.rank, totalCars: this.cars.length,
      winnerName: winner ? winner.name : this.cars.length > 1 ? standings[0].name : 'You',
      playerWon: winner ? winner.isPlayer : this.cars.length === 1,
      finalWpm: wpmFromChars(this.typing.progressChars, elapsed),
      averageWpm: this.wpmTime > 0 ? this.wpmIntegral / this.wpmTime : m.averageWpm,
      peakWpm: Math.max(this.peakWpm, 0), accuracy: m.accuracy, errors: m.errors,
      correctChars: m.correctChars, totalKeystrokes: m.totalKeystrokes, duration,
      overtakes: this.overtakeEvents.filter((e) => e.passerId === 'player').length,
      uniqueOvertaken: this.passed.size, distance: this.player.distance,
      skillWpm: this.config.skillWpm, standings, timestamp: Date.now(),
    };
    this.setPhase('finished');
    this.emit('end', this.result);
  }
}
