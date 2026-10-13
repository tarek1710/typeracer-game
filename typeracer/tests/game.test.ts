import { describe, expect, it } from 'vitest';
import { makeRace, simulate } from './helpers';
import { calibrateOpponents } from '../src/game/AIDifficultyManager';
import { OvertakingManager } from '../src/game/OvertakingManager';
import { accuracyMultiplier, integrate, stepSpeed, targetSpeed } from '../src/game/RacingPhysics';
import { TypingEngine } from '../src/game/TypingEngine';
import { RecentWpmTracker, wpmFromChars } from '../src/game/WPMCalculator';
import { accuracyPercent } from '../src/game/AccuracyCalculator';
import { GameLoop } from '../src/game/GameLoop';
import { mulberry32 } from '../src/game/rng';
import type { CarState } from '../src/game/types';

const car = (id: string, lane: number, speed = 0): CarState => ({
  id, name: id, color: '#fff', isPlayer: id === 'p', kind: 'hatch', tag: '', lane, distance: 0, speed, targetSpeed: speed,
  currentWpm: 0, finished: false, finishTime: null, finishRank: null,
});
const targets = (e: ReturnType<typeof makeRace>) => e.opponents.map((o) => o.profile.targetWpm);

describe('Fixed rivals per level, 5 cars, distinct cars', () => {
  it('beginner 10/20/30/40, intermediate 20/40/60/80, advanced 40/60/80/100', () => {
    expect(targets(makeRace({ category: 'beginner' }))).toEqual([10, 20, 30, 40]);
    expect(targets(makeRace({ category: 'intermediate' }))).toEqual([20, 40, 60, 80]);
    expect(targets(makeRace({ category: 'advanced' }))).toEqual([40, 60, 80, 100]);
    expect(targets(makeRace({ category: 'professional' }))).toEqual([40, 60, 80, 100]);
    expect(targets(makeRace({ category: 'programming' }))).toEqual([20, 40, 60, 80]);
    expect(targets(makeRace({ category: 'bangla' }))).toEqual([10, 20, 30, 40]);
  });
  it('every competitive mode has 5 cars with different looks; practice is solo', () => {
    for (const mode of ['quick', 'classic', 'timetrial', 'accuracy', 'custom'] as const) {
      const e = makeRace({ mode, customText: 'some custom text to type here for the race' });
      expect(e.cars.length).toBe(5);
      expect(new Set(e.cars.map((c) => c.kind)).size).toBe(5);
      expect(new Set(e.cars.map((c) => c.lane)).size).toBe(5);
      expect(e.cars.filter((c) => c.isPlayer).length).toBe(1);
    }
    expect(makeRace({ mode: 'practice' }).cars.length).toBe(1);
  });
  it('each rival has its own acceleration profile and max speed', () => {
    const e = makeRace({ category: 'intermediate' });
    expect(new Set(e.opponents.map((o) => o.profile.accelMul)).size).toBe(4);
    expect(new Set(e.opponents.map((o) => o.profile.maxWpm.toFixed(1))).size).toBe(4);
  });
  it('rivals actually run at their WPM (same physics as the player)', () => {
    for (const cat of ['beginner', 'intermediate', 'advanced'] as const) {
      const e = makeRace({ category: cat, seed: 5 });
      e.startCountdown();
      while (e.phase === 'countdown') e.update(1 / 60);
      const sum = new Map<string, number>(); let n = 0;
      while (e.time < 40 && e.phase === 'racing') {
        e.update(1 / 60);
        if (e.time > 8) { n++; for (const o of e.opponents) sum.set(o.car.id, (sum.get(o.car.id) ?? 0) + o.car.speed); }
      }
      for (const o of e.opponents) {
        const expected = targetSpeed(o.profile.targetWpm, 1);
        expect(sum.get(o.car.id)! / n / expected).toBeGreaterThan(0.85);
        expect(sum.get(o.car.id)! / n / expected).toBeLessThan(1.15);
      }
    }
  });
  it('slow rivals and fast rivals really differ in speed', () => {
    expect(targetSpeed(10, 1)).toBeLessThan(targetSpeed(40, 1) / 3);
    expect(targetSpeed(100, 1)).toBeGreaterThan(targetSpeed(10, 1) * 9);
  });
});

describe('Test 1 - beginner level', () => {
  it('a 25 WPM typist passes the 10 and 20 WPM cars and is passed by the 40 WPM car; no teleports', () => {
    const e = makeRace({ category: 'beginner' });
    const s = simulate(e, { wpm: () => 25, accuracy: 0.96 });
    expect(e.phase).toBe('finished');
    const r = e.result!;
    expect(r.finalPosition).toBeGreaterThanOrEqual(2);
    expect(r.finalPosition).toBeLessThanOrEqual(4);
    expect(r.uniqueOvertaken).toBeGreaterThanOrEqual(1);
    expect(e.overtakeEvents.some((v) => v.passedId === 'player')).toBe(true);
    expect(s.maxSpeedSeen).toBeLessThanOrEqual(s.vmax);
  });
  it('a 12 WPM typist beats only the slowest car and still finishes', () => {
    const e = makeRace({ category: 'beginner' });
    simulate(e, { wpm: () => 12, accuracy: 1, maxTime: 400 });
    expect(e.phase).toBe('finished');
    expect(e.result!.finalPosition).toBeGreaterThanOrEqual(4);
  });
});

describe('Test 2 - intermediate level', () => {
  it('45 WPM passes 20 and 40 WPM cars at different times; ranks follow distance', () => {
    const e = makeRace({ category: 'intermediate' });
    let orderOk = true;
    simulate(e, {
      wpm: () => 45, accuracy: 0.98,
      onStep: (r) => {
        const rp = r.overtaking.rankOf('player');
        if (r.cars.some((c) => !c.finished && c.distance > r.player.distance + 6 && r.overtaking.rankOf(c.id) > rp)) orderOk = false;
      },
    });
    expect(orderOk).toBe(true);
    const passes = e.overtakeEvents.filter((v) => v.passerId === 'player');
    expect(passes.length).toBeGreaterThanOrEqual(1);
    expect(e.result!.finalPosition).toBeGreaterThanOrEqual(2);
    expect(e.result!.finalPosition).toBeLessThanOrEqual(4);
  });
});

describe('Test 3 - advanced level', () => {
  it('a 90 WPM typist is not capped, reaches high speed, and beats the slower cars', () => {
    const e = makeRace({ category: 'advanced' });
    let top = 0;
    simulate(e, { wpm: () => 90, accuracy: 0.98, onStep: (r) => { top = Math.max(top, r.player.speed); } });
    expect(top).toBeGreaterThan(70);
    expect(e.phase).toBe('finished');
    expect(e.result!.finalPosition).toBeLessThanOrEqual(3);
    expect(e.result!.finalWpm).toBeGreaterThan(75);
  });
  it('a 100+ WPM typist can win', () => {
    const e = makeRace({ category: 'advanced', seed: 3 });
    simulate(e, { wpm: () => 115, accuracy: 0.99 });
    expect(e.result!.finalPosition).toBe(1);
  });
});

describe('Test 4 - speed changes and standing still', () => {
  it('speeds up, then STOPS completely when typing stops, then drives again', () => {
    const e = makeRace({ mode: 'practice' });
    const speed: Record<number, number> = {}; const dist: Record<number, number> = {};
    simulate(e, {
      wpm: (t) => (t < 15 ? 20 : t < 35 ? 60 : t < 50 ? 0 : 40), maxTime: 70, accuracy: 1,
      onStep: (r, t) => { for (const s of [14, 34, 40, 44, 49, 60]) if (Math.abs(t - s) < 1 / 120) { speed[s] = r.player.speed; dist[s] = r.player.distance; } },
    });
    expect(speed[34]).toBeGreaterThan(speed[14] * 1.5);
    expect(speed[40]).toBe(0); // 5 s after stopping: stopped
    expect(speed[44]).toBe(0);
    expect(dist[49] - dist[44]).toBeLessThan(0.01); // stays exactly where it is
    expect(speed[60]).toBeGreaterThan(10);
  });
  it('before the first key the car does not move at all', () => {
    const e = makeRace({ category: 'beginner' });
    e.startCountdown();
    for (let i = 0; i < 600; i++) e.update(1 / 60);
    expect(e.player.distance).toBe(0);
    expect(e.player.speed).toBe(0);
    expect(e.opponents.every((o) => o.car.distance > 0)).toBe(true);
  });
  it('slow typing lets a rival gain ground, fast typing wins it back; motion stays smooth', () => {
    const e = makeRace({ category: 'intermediate' });
    const rival = e.cars.find((c) => c.id === 'bea')!; // 40 WPM
    const gap: Record<number, number> = {};
    let prev = 0, maxAccel = 0;
    simulate(e, {
      wpm: (t) => (t < 20 ? 40 : t < 40 ? 15 : 90), maxTime: 60, accuracy: 1,
      onStep: (r, t) => {
        maxAccel = Math.max(maxAccel, Math.abs(r.player.speed - prev) * 60); prev = r.player.speed;
        for (const s of [20, 40, 58]) if (Math.abs(t - s) < 1 / 120) gap[s] = r.player.distance - rival.distance;
      },
    });
    expect(gap[40]).toBeLessThan(gap[20]);
    expect(gap[58]).toBeGreaterThan(gap[40]);
    expect(maxAccel).toBeLessThan(25);
  });
});

describe('Test 5 - overtaking', () => {
  it('the faster car gains, passes; swapping speeds swaps the order (no teleport)', () => {
    const a = car('p', 1), b = car('x', 0);
    a.distance = 0; b.distance = 120;
    const om = new OvertakingManager([a, b]);
    const dt = 1 / 60;
    const run = (secs: number, ta: number, tb: number) => {
      const events = []; let maxStep = 0;
      for (let i = 0; i < secs * 60; i++) {
        for (const [c, t] of [[a, ta], [b, tb]] as [CarState, number][]) {
          c.speed = stepSpeed(c.speed, t, dt);
          const d0 = c.distance; c.distance = integrate(c.distance, c.speed, dt);
          maxStep = Math.max(maxStep, c.distance - d0);
        }
        events.push(...om.update([a, b], i * dt));
      }
      return { events, maxStep };
    };
    const first = run(40, 50, 30);
    expect(a.distance).toBeGreaterThan(b.distance);
    expect(om.rankOf('p')).toBe(1);
    expect(first.events.length).toBe(1);
    expect(first.events[0].passerId).toBe('p');
    expect(first.maxStep).toBeLessThan(50 * dt + 1e-6);
    const second = run(80, 25, 55);
    expect(b.distance).toBeGreaterThan(a.distance);
    expect(om.rankOf('x')).toBe(1);
    expect(second.events.map((e) => e.passerId)).toEqual(['x']);
  });
  it('equal-speed cars with tiny noise do not flicker', () => {
    const a = car('p', 0), b = car('x', 1);
    const om = new OvertakingManager([a, b]);
    const rng = mulberry32(3);
    let swaps = 0;
    a.distance = 100; b.distance = 100;
    for (let i = 0; i < 3000; i++) {
      a.distance += 40 / 60 + (rng() - 0.5) * 0.4; b.distance += 40 / 60 + (rng() - 0.5) * 0.4;
      swaps += om.update([a, b], i / 60).length;
    }
    expect(swaps).toBeLessThan(6);
  });
  it('distance integrates speed over time and is frame-rate independent', () => {
    let d1 = 0, d2 = 0;
    for (let i = 0; i < 600; i++) { d1 = integrate(d1, 30, 1 / 60); d2 = integrate(d2, 20, 1 / 60); }
    expect(d1 / d2).toBeCloseTo(1.5, 5);
    let x = 0, y = 0, vx = 0, vy = 0;
    for (let i = 0; i < 300; i++) { vx = stepSpeed(vx, 50, 1 / 30); x = integrate(x, vx, 1 / 30); }
    for (let i = 0; i < 600; i++) { vy = stepSpeed(vy, 50, 1 / 60); y = integrate(y, vy, 1 / 60); }
    expect(Math.abs(x - y) / y).toBeLessThan(0.02);
  });
  it('formula sanity', () => {
    expect(accuracyMultiplier(1)).toBe(1);
    expect(accuracyMultiplier(0.5)).toBeCloseTo(0.6);
    expect(accuracyMultiplier(0.9, true)).toBeLessThan(accuracyMultiplier(0.9));
    expect(targetSpeed(0, 1)).toBe(0);
    expect(targetSpeed(60, 1)).toBe(55);
    expect(targetSpeed(30, 1)).toBeCloseTo(27.5);
    expect(stepSpeed(0.3, 0, 1 / 60)).toBe(0);
  });
});

describe('Test 6 - lifecycle', () => {
  it('countdown 3-2-1-GO, pause freezes everything, resume continues, play again is clean', () => {
    const e = makeRace({ mode: 'quick' });
    const ticks: number[] = [];
    e.on('countdown', (n) => ticks.push(n));
    let started = 0; e.on('start', () => started++);
    e.startCountdown(); e.startCountdown();
    for (let i = 0; i < 200 && e.phase === 'countdown'; i++) e.update(1 / 60);
    expect(ticks).toEqual([3, 2, 1]);
    expect(started).toBe(1);
    expect(e.phase).toBe('racing');
    expect(e.typeInput('x').accepted).toBe(1);
    for (let i = 0; i < 120; i++) e.update(1 / 60);
    e.pause();
    const snap = { t: e.time, d: e.cars.map((c) => c.distance) };
    for (let i = 0; i < 300; i++) e.update(1 / 60);
    expect(e.time).toBe(snap.t);
    expect(e.cars.map((c) => c.distance)).toEqual(snap.d);
    expect(e.typeInput('xy').accepted).toBe(0);
    e.resume(); e.update(1 / 60);
    expect(e.time).toBeGreaterThan(snap.t);
    const rest = makeRace({ mode: 'quick', seed: 99 });
    simulate(rest, { wpm: () => 45 });
    expect(rest.phase).toBe('finished');
    expect(rest.result!.standings.length).toBe(5);
    const again = makeRace({ mode: 'quick', seed: 100 });
    expect(again.phase).toBe('idle');
    expect(again.time).toBe(0);
    expect(again.typing.totalKeystrokes).toBe(0);
    expect(again.cars.every((c) => c.distance === 0 && !c.finished)).toBe(true);
  });
  it('finish order comes from real crossing times; each car finishes once', () => {
    const e = makeRace({ mode: 'quick', category: 'advanced' });
    const fin: string[] = []; e.on('carFinished', (c) => fin.push(c.id));
    simulate(e, { wpm: () => 70, accuracy: 0.97 });
    expect(new Set(fin).size).toBe(fin.length);
    const finished = e.result!.standings.filter((s) => s.finished);
    for (let i = 1; i < finished.length; i++) expect(finished[i].finishTime!).toBeGreaterThanOrEqual(finished[i - 1].finishTime!);
  });
  it('time trial ends exactly on the limit (with rivals); practice ends only manually', () => {
    const tt = makeRace({ mode: 'timetrial', timeLimit: 30 });
    simulate(tt, { wpm: () => 40 });
    expect(tt.result!.reason).toBe('time');
    expect(tt.result!.duration).toBeCloseTo(30, 3);
    expect(tt.result!.finalWpm).toBeGreaterThan(30);
    expect(tt.result!.standings.length).toBe(5);
    const pr = makeRace({ mode: 'practice' });
    simulate(pr, { wpm: () => 40, maxTime: 90 });
    expect(pr.phase).toBe('racing');
    pr.finishNow();
    expect(pr.phase).toBe('finished');
  });
  it('GameLoop never runs two loops and stops cleanly', () => {
    const pending = new Map<number, (ts: number) => void>();
    let id = 0, calls = 0;
    const raf = (cb: (ts: number) => void) => { pending.set(++id, cb); return id; };
    const caf = (i: number) => { pending.delete(i); };
    const flush = (ts: number) => { const cbs = [...pending.values()]; pending.clear(); cbs.forEach((cb) => cb(ts)); };
    const loop = new GameLoop(() => { calls++; }, raf, caf);
    loop.start(); loop.start(); loop.start();
    expect(pending.size).toBe(1);
    flush(0); flush(16); flush(32);
    expect(calls).toBe(3);
    loop.stop();
    expect(pending.size).toBe(0);
    loop.start();
    expect(pending.size).toBe(1);
    loop.stop(); flush(100);
    expect(calls).toBe(3);
  });
});

describe('Test 7 - input accuracy', () => {
  const T = (s: string) => new TypingEngine(s);
  it('counts keystrokes, supports Backspace, formula values', () => {
    const t = T('hello world');
    let now = 0; const key = (v: string) => t.applyInput(v, (now += 0.1));
    key('h'); key('he'); key('hex');
    expect(t.errors).toBe(1);
    expect(t.prefixCorrect).toBe(2);
    expect(t.charStates().slice(0, 4)).toEqual(['correct', 'correct', 'wrong', 'current']);
    key('he');
    expect(t.backspaces).toBe(1);
    key('hel'); key('hell'); key('hello');
    expect(t.totalKeystrokes).toBe(6);
    expect(t.correctKeystrokes).toBe(5);
    expect(accuracyPercent(5, 6)).toBeCloseTo(83.33, 1);
    expect(wpmFromChars(300, 60)).toBe(60);
    expect(wpmFromChars(0, 10)).toBe(0);
    expect(accuracyPercent(0, 0)).toBe(100);
  });
  it('handles empty input and clearing everything', () => {
    const t = T('abc');
    expect(t.applyInput('', 1).accepted).toBe(0);
    t.applyInput('a', 2); t.applyInput('ab', 3);
    const r = t.applyInput('', 4);
    expect(r.backspaces).toBe(2);
    expect(t.typedString).toBe('');
  });
  it('rejects pasted text and multi-char injections', () => {
    const t = T('hello world');
    expect(t.applyInput('hello world', 1, { pasted: true }).blocked).toBe('paste');
    expect(t.typedString).toBe('');
    expect(t.applyInput('hello', 2).blocked).toBe('chunk');
    expect(t.typedString).toBe('');
  });
  it('limits artificial / key-repeat speed and wrong-char runaway', () => {
    const t = T('aaaaaaaaaaaaaaaa');
    t.applyInput('a', 1.000); const r = t.applyInput('aa', 1.002);
    expect(r.blocked).toBe('rate');
    expect(t.typedLength).toBe(1);
    const w = T('abcdefghijklmnop');
    let s = ''; let now = 0;
    for (let i = 0; i < 12; i++) { s += 'z'; w.applyInput(s, (now += 0.1)); }
    expect(w.typedLength).toBe(6);
  });
  it('wrong characters never add speed credit', () => {
    const tr = new RecentWpmTracker();
    const t = T('hello world');
    t.applyInput('x', 1); t.applyInput('xx', 1.1); t.applyInput('xxx', 1.2);
    tr.record(1.2, t.progressChars);
    expect(tr.recentWpm(3)).toBe(0);
  });
  it('recent WPM decays when typing stops', () => {
    const tr = new RecentWpmTracker();
    for (let i = 1; i <= 100; i++) tr.record(i * 0.1, i);
    expect(tr.recentWpm(10)).toBeGreaterThan(110);
    expect(tr.recentWpm(11.5)).toBeLessThan(70);
    expect(tr.recentWpm(14)).toBe(0);
  });
  it('Bangla: committed IME input, composition deferral, NFC normalisation', () => {
    const t = T('বাংলা ভাষা');
    const c = t.applyInput('ব', 1, { composing: true });
    expect(c.deferred).toBe(true);
    expect(t.totalKeystrokes).toBe(0);
    const done = t.applyInput('বাংলা', 2, { committed: true });
    expect(done.accepted).toBe(5);
    expect(t.prefixCorrect).toBe(5);
    expect(t.errors).toBe(0);
    const n = new TypingEngine('য়');
    n.applyInput('য়', 1, { committed: true });
    expect(n.errors).toBe(0);
    const w = T('আমি'); w.applyInput('আ', 1); w.applyInput('আন', 2);
    expect(w.errors).toBe(1);
  });
  it('end to end: wrong keys do not move the car, correct keys do', () => {
    const bad = makeRace({ mode: 'practice' });
    simulate(bad, { wpm: () => 40, accuracy: 0, maxTime: 20 });
    const good = makeRace({ mode: 'practice' });
    simulate(good, { wpm: () => 40, accuracy: 1, maxTime: 20 });
    expect(good.player.distance).toBeGreaterThan(bad.player.distance * 3);
    expect(bad.metrics().accuracy).toBeLessThan(40);
  });
  it('passage rolls over seamlessly and counts keep accumulating', () => {
    const e = makeRace({ mode: 'practice', category: 'beginner' });
    simulate(e, { wpm: () => 120, maxTime: 25 });
    expect(e.typing.completedChars).toBeGreaterThan(0);
    expect(e.metrics().correctChars).toBeGreaterThan(200);
  });
});

describe('AI calibration properties', () => {
  it('calibrateOpponents gives the fixed table, in order', () => {
    const a = calibrateOpponents('intermediate', mulberry32(1));
    expect(a.map((x) => x.targetWpm)).toEqual([20, 40, 60, 80]);
    expect(new Set(a.map((x) => x.kind)).size).toBe(4);
  });
});
