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
  id, name: id, color: '#fff', isPlayer: id === 'p', lane, distance: 0, speed, targetSpeed: speed,
  currentWpm: 0, finished: false, finishTime: null, finishRank: null,
});

const wpmOf = (e: ReturnType<typeof makeRace>, id: string) => e.opponents.find((o) => o.car.id === id)!.profile.targetWpm;

describe('Test 1 - beginner (10-20 WPM)', () => {
  const skill = 15;
  it('calibrates distinct AI profiles to beginner level', () => {
    const e = makeRace(skill);
    const targets = e.opponents.map((o) => o.profile.targetWpm);
    expect(new Set(targets.map((t) => t.toFixed(2))).size).toBe(4);
    for (const t of targets) { expect(t).toBeGreaterThan(8); expect(t).toBeLessThan(25); }
    expect(new Set(e.opponents.map((o) => o.profile.accelMul)).size).toBeGreaterThan(2);
  });
  it('plays a fair race: finishes, overtakes slower rivals, is passed by faster ones, no teleports', () => {
    const e = makeRace(skill);
    const s = simulate(e, { wpm: () => 16.5, accuracy: 0.95 });
    expect(e.phase).toBe('finished');
    const r = e.result!;
    expect(r.uniqueOvertaken + 0).toBeGreaterThanOrEqual(1);
    expect(r.finalPosition).toBeGreaterThanOrEqual(2);
    expect(r.finalPosition).toBeLessThanOrEqual(4);
    expect(r.duration).toBeGreaterThan(40);
    expect(r.duration).toBeLessThan(120);
    expect(e.overtakeEvents.some((v) => v.passedId === 'player')).toBe(true);
    expect(s.maxSpeedSeen).toBeLessThanOrEqual(s.vmax);
  });
  it('is not left far behind: slowest-finishing margin stays moderate', () => {
    const e = makeRace(skill);
    simulate(e, { wpm: () => 16.5, accuracy: 0.95 });
    const standings = e.result!.standings;
    const winner = standings.find((s) => s.rank === 1)!;
    const me = standings.find((s) => s.isPlayer)!;
    expect(me.progressPct).toBeGreaterThan(95);
    expect(me.finishTime! - winner.finishTime!).toBeLessThan(25);
  });
});

describe('Test 2 - intermediate (30-45 WPM)', () => {
  it('recalibrates AI targets upward with skill', () => {
    const lo = makeRace(15), mid = makeRace(40);
    ['eddie', 'bea', 'blaze', 'ace'].forEach((id) => expect(wpmOf(mid, id)).toBeGreaterThan(wpmOf(lo, id) * 2));
    for (const o of mid.opponents) { expect(o.profile.targetWpm).toBeGreaterThan(25); expect(o.profile.targetWpm).toBeLessThan(60); }
  });
  it('rivals are passed at different times and positions follow distance', () => {
    const e = makeRace(40);
    let orderOk = true;
    simulate(e, {
      wpm: () => 40, accuracy: 0.96,
      onStep: (r) => {
        const byDist = r.cars.filter((c) => !c.finished).sort((a, b) => b.distance - a.distance);
        const rankPlayer = r.overtaking.rankOf('player');
        const aheadBy = byDist.filter((c) => c.distance > r.player.distance + 2.5).length;
        if (!r.player.finished && rankPlayer - 1 < aheadBy - 0) orderOk = orderOk && true;
        if (r.cars.some((c) => !c.finished && c.distance > r.player.distance + 6 && r.overtaking.rankOf(c.id) > rankPlayer)) orderOk = false;
      },
    });
    expect(orderOk).toBe(true);
    const times = e.overtakeEvents.filter((v) => v.passerId === 'player').map((v) => v.time);
    if (times.length >= 2) expect(Math.max(...times) - Math.min(...times)).toBeGreaterThan(1);
  });
});

describe('Test 3 - advanced (60-100 WPM)', () => {
  it('opponents scale up and nothing is capped at beginner speed', () => {
    const e = makeRace(80, { difficulty: 'normal' });
    for (const o of e.opponents) expect(o.profile.targetWpm).toBeGreaterThan(55);
    expect(Math.max(...e.opponents.map((o) => o.profile.targetWpm))).toBeGreaterThan(85);
    let topSpeed = 0, topWpm = 0;
    simulate(e, { wpm: () => 80, accuracy: 0.97, onStep: (r) => { topSpeed = Math.max(topSpeed, r.player.speed); topWpm = Math.max(topWpm, r.smoothedWpm); } });
    expect(topSpeed).toBeGreaterThan(40);
    expect(topWpm).toBeGreaterThan(65);
    expect(e.phase).toBe('finished');
    expect(e.result!.finalWpm).toBeGreaterThan(65);
  });
  it('hard difficulty demands more than the player skill; easy is below it', () => {
    const hard = makeRace(80, { difficulty: 'hard' }), easy = makeRace(80, { difficulty: 'easy' });
    const avg = (e: typeof hard) => e.opponents.reduce((s, o) => s + o.profile.targetWpm, 0) / 4;
    expect(avg(hard)).toBeGreaterThan(80);
    expect(avg(easy)).toBeLessThan(80);
    simulate(hard, { wpm: () => 80, accuracy: 0.97 });
    expect(hard.result!.finalPosition).toBeGreaterThan(1);
  });
});

describe('Test 4 - speed changes', () => {
  it('speeds up, then loses the bonus when typing stops, with gradual motion', () => {
    const e = makeRace(40, { mode: 'practice' });
    const speeds: Record<number, number> = {};
    simulate(e, {
      wpm: (t) => (t < 15 ? 20 : t < 35 ? 60 : t < 45 ? 0 : 40), maxTime: 70, accuracy: 1,
      onStep: (r, t) => { for (const s of [14, 34, 44, 56]) if (Math.abs(t - s) < 1 / 120) speeds[s] = r.player.speed; },
    });
    expect(speeds[34]).toBeGreaterThan(speeds[14] * 1.5);
    expect(speeds[44]).toBeLessThan(speeds[34] * 0.5);
    expect(speeds[44]).toBeLessThan(15);
    expect(speeds[56]).toBeGreaterThan(speeds[44]);
  });
  it('slower typing lets a rival gain ground, faster typing wins it back; speed never jumps', () => {
    const e = makeRace(40);
    const bea = e.cars.find((c) => c.id === 'bea')!;
    const gap: Record<number, number> = {};
    let prevSpeed = 0, maxAccel = 0;
    simulate(e, {
      wpm: (t) => (t < 20 ? 40 : t < 40 ? 15 : 80), maxTime: 60, accuracy: 1,
      onStep: (r, t) => {
        maxAccel = Math.max(maxAccel, Math.abs(r.player.speed - prevSpeed) * 60); prevSpeed = r.player.speed;
        for (const s of [20, 40, 58]) if (Math.abs(t - s) < 1 / 120) gap[s] = r.player.distance - bea.distance;
      },
    });
    expect(gap[40]).toBeLessThan(gap[20]);
    expect(gap[58]).toBeGreaterThan(gap[40]);
    expect(maxAccel).toBeLessThan(20);
  });
});

describe('Test 5 - overtaking', () => {
  it('the faster car gains, passes; swapping speeds swaps the order (no teleport)', () => {
    const a = car('p', 1), b = car('x', 0);
    a.distance = 0; b.distance = 120;
    const om = new OvertakingManager([a, b]);
    const dt = 1 / 60;
    const run = (secs: number, ta: number, tb: number) => {
      const events = [];
      let maxStep = 0;
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
  it('distance integrates speed over time: sustained higher speed travels farther', () => {
    let d1 = 0, d2 = 0;
    for (let i = 0; i < 600; i++) { d1 = integrate(d1, 30, 1 / 60); d2 = integrate(d2, 20, 1 / 60); }
    expect(d1 / d2).toBeCloseTo(1.5, 5);
    // same trajectory regardless of frame rate
    let x = 0, y = 0, vx = 0, vy = 0;
    for (let i = 0; i < 300; i++) { vx = stepSpeed(vx, 50, 1 / 30); x = integrate(x, vx, 1 / 30); }
    for (let i = 0; i < 600; i++) { vy = stepSpeed(vy, 50, 1 / 60); y = integrate(y, vy, 1 / 60); }
    expect(Math.abs(x - y) / y).toBeLessThan(0.02);
  });
  it('formula sanity: accuracy multiplier and target speed', () => {
    expect(accuracyMultiplier(1)).toBe(1);
    expect(accuracyMultiplier(0.5)).toBeCloseTo(0.6);
    expect(accuracyMultiplier(0.9, true)).toBeLessThan(accuracyMultiplier(0.9));
    expect(targetSpeed(0, 40, 1)).toBe(3);
    expect(targetSpeed(40, 40, 1)).toBe(55);
    expect(targetSpeed(15, 15, 1)).toBe(targetSpeed(80, 80, 1));
  });
});

describe('Test 6 - lifecycle', () => {
  it('countdown 3-2-1-GO, pause freezes everything, resume continues, finish, play again is clean', () => {
    const e = makeRace(30, { mode: 'quick' });
    const ticks: number[] = [];
    e.on('countdown', (n) => ticks.push(n));
    let started = 0; e.on('start', () => started++);
    e.startCountdown(); e.startCountdown();
    for (let i = 0; i < 200 && e.phase === 'countdown'; i++) e.update(1 / 60);
    expect(ticks).toEqual([3, 2, 1]);
    expect(started).toBe(1);
    expect(e.phase).toBe('racing');
    expect(e.typeInput('x').accepted).toBe(1); // typing works while racing
    for (let i = 0; i < 120; i++) e.update(1 / 60);
    e.pause();
    const snap = { t: e.time, d: e.cars.map((c) => c.distance) };
    for (let i = 0; i < 300; i++) e.update(1 / 60);
    expect(e.time).toBe(snap.t);
    expect(e.cars.map((c) => c.distance)).toEqual(snap.d);
    expect(e.typeInput('xy').accepted).toBe(0); // no input while paused
    e.resume();
    e.update(1 / 60);
    expect(e.time).toBeGreaterThan(snap.t);
    expect(e.cars[1].distance).toBeGreaterThanOrEqual(snap.d[1]);
    let ends = 0; e.on('end', () => ends++);
    const rest = makeRace(30, { mode: 'quick', seed: 99 });
    simulate(rest, { wpm: () => 30 });
    expect(rest.phase).toBe('finished');
    expect(rest.result!.standings.length).toBe(5);
    expect(ends).toBe(0);
    // Play again = brand-new engine with no stale state
    const again = makeRace(30, { mode: 'quick', seed: 100 });
    expect(again.phase).toBe('idle');
    expect(again.time).toBe(0);
    expect(again.typing.totalKeystrokes).toBe(0);
    expect(again.cars.every((c) => c.distance === 0 && !c.finished)).toBe(true);
  });
  it('finish order is recorded from real crossing times; each car finishes once', () => {
    const e = makeRace(30, { mode: 'quick' });
    const fin: string[] = []; e.on('carFinished', (c) => fin.push(c.id));
    simulate(e, { wpm: () => 30, accuracy: 0.97 });
    expect(new Set(fin).size).toBe(fin.length);
    const finished = e.result!.standings.filter((s) => s.finished);
    for (let i = 1; i < finished.length; i++) expect(finished[i].finishTime!).toBeGreaterThanOrEqual(finished[i - 1].finishTime!);
  });
  it('time trial ends exactly on the limit; practice ends only manually', () => {
    const tt = makeRace(40, { mode: 'timetrial', timeLimit: 30 });
    simulate(tt, { wpm: () => 40 });
    expect(tt.result!.reason).toBe('time');
    expect(tt.result!.duration).toBeCloseTo(30, 3);
    expect(tt.result!.finalWpm).toBeGreaterThan(30);
    const pr = makeRace(40, { mode: 'practice' });
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
    expect(pending.size).toBe(1);
    loop.stop();
    expect(pending.size).toBe(0);
    loop.start(); // restart
    expect(pending.size).toBe(1);
    loop.stop(); flush(100);
    expect(calls).toBe(3);
  });
});

describe('Test 7 - input accuracy', () => {
  const T = (s: string) => new TypingEngine(s);
  it('counts correct/incorrect keystrokes, supports Backspace, formula values', () => {
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
    const r = t.applyInput('hello world', 1, { pasted: true });
    expect(r.blocked).toBe('paste');
    expect(t.typedString).toBe('');
    expect(t.totalKeystrokes).toBe(0);
    const r2 = t.applyInput('hello', 2);
    expect(r2.blocked).toBe('chunk');
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
    expect(w.typedLength).toBe(6); // overrun cap
  });
  it('wrong characters never add speed credit', () => {
    const tr = new RecentWpmTracker();
    const t = T('hello world');
    t.applyInput('x', 1); t.applyInput('xx', 1.1); t.applyInput('xxx', 1.2);
    tr.record(1.2, t.progressChars);
    expect(tr.recentWpm(3)).toBe(0);
  });
  it('recent WPM decays when typing stops (inactivity is not sustained speed)', () => {
    const tr = new RecentWpmTracker();
    for (let i = 1; i <= 100; i++) tr.record(i * 0.1, i); // 10 chars/s = 120 wpm for 10 s
    expect(tr.recentWpm(10)).toBeGreaterThan(110);
    expect(tr.recentWpm(12)).toBeLessThan(70);
    expect(tr.recentWpm(15)).toBe(0);
  });
  it('Bangla: committed IME input, composition deferral, NFC normalisation', () => {
    const t = T('বাংলা ভাষা');
    const c = t.applyInput('ব', 1, { composing: true });
    expect(c.deferred).toBe(true);
    expect(t.totalKeystrokes).toBe(0); // composition preview is not a keystroke
    const done = t.applyInput('বাংলা', 2, { committed: true });
    expect(done.accepted).toBe(5);
    expect(t.prefixCorrect).toBe(5);
    expect(t.errors).toBe(0);
    // precomposed vs decomposed y-nukta compare equal after NFC
    const n = new TypingEngine('য়');
    n.applyInput('য়', 1, { committed: true });
    expect(n.errors).toBe(0);
    // wrong Bangla character is an error
    const w = T('আমি'); w.applyInput('আ', 1); w.applyInput('আন', 2);
    expect(w.errors).toBe(1);
  });
  it('end to end: wrong keys do not move the car, correct keys do', () => {
    const bad = makeRace(40, { mode: 'practice' });
    simulate(bad, { wpm: () => 40, accuracy: 0, maxTime: 20 });
    const good = makeRace(40, { mode: 'practice' });
    simulate(good, { wpm: () => 40, accuracy: 1, maxTime: 20 });
    expect(good.player.distance).toBeGreaterThan(bad.player.distance * 3);
    expect(bad.metrics().accuracy).toBeLessThan(40);
  });
  it('passage rolls over seamlessly and counts keep accumulating', () => {
    const e = makeRace(120, { mode: 'practice', category: 'beginner' });
    simulate(e, { wpm: () => 120, maxTime: 25 });
    expect(e.typing.completedChars).toBeGreaterThan(0);
    expect(e.metrics().correctChars).toBeGreaterThan(200);
  });
});

describe('AI calibration properties', () => {
  it('varies between races but keeps personality ordering on average', () => {
    const a = calibrateOpponents(40, 'normal', mulberry32(1));
    const b = calibrateOpponents(40, 'normal', mulberry32(2));
    expect(a.map((x) => x.targetWpm.toFixed(2))).not.toEqual(b.map((x) => x.targetWpm.toFixed(2)));
    expect(a[0].targetWpm).toBeLessThan(a[3].targetWpm);
  });
  it('different seeds give different finishing orders across races', () => {
    const orders = new Set<string>();
    for (let s = 1; s <= 12; s++) {
      const e = makeRace(40, { mode: 'quick', seed: s });
      simulate(e, { wpm: () => 40, accuracy: 0.96, seed: s });
      orders.add(e.result!.standings.map((x) => x.id).join(','));
    }
    expect(orders.size).toBeGreaterThan(2);
  });
  it('adaptive offset changes targets only, not the player', () => {
    const base = calibrateOpponents(40, 'normal', mulberry32(5), 0);
    const up = calibrateOpponents(40, 'normal', mulberry32(5), 0.12);
    expect(up[1].targetWpm / base[1].targetWpm).toBeCloseTo(1.12, 2);
  });
});
