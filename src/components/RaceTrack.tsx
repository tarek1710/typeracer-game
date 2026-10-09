import { forwardRef, memo, useEffect, useImperativeHandle, useRef } from 'react';
import { CarSprite } from './CarSprite';
import { maxSpeed } from '../game/RacingPhysics';
import { clamp } from '../game/rng';
import type { RaceEngine } from '../game/RaceStateManager';

export interface RaceTrackHandle { render: (engine: RaceEngine, dt: number) => void }

const LANE_H = 56;
const PAD = 44; // start / finish line inset from the edges
const CAR_W = 72;
const ordinal = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : Math.min(n % 10, 4) % 4] ?? 'th'}`;

/**
 * DOM-based track. Car positions are written straight to element transforms from the
 * game loop (no React re-render per frame). Position = progress along the track,
 * derived from each car's integrated distance.
 */
export const RaceTrack = memo(forwardRef<RaceTrackHandle, { engine: RaceEngine }>(function RaceTrack({ engine }, ref) {
  const wrap = useRef<HTMLDivElement>(null);
  const cars = useRef<Record<string, HTMLDivElement | null>>({});
  const ranks = useRef<Record<string, HTMLSpanElement | null>>({});
  const width = useRef(900);
  const offset = useRef(0);
  const lastRank = useRef<Record<string, number>>({});

  const render = (e: RaceEngine, dt: number) => {
    const w = width.current;
    const start = PAD - CAR_W * 0.35;
    const end = w - PAD - CAR_W;
    const goal = e.modeCfg.end === 'distance';
    for (const c of e.cars) {
      const el = cars.current[c.id];
      if (!el) continue;
      const frac = goal ? e.progressOf(c) : Math.min(e.progressOf(c), 0.94);
      el.style.transform = `translate3d(${(start + frac * (end - start)).toFixed(1)}px,0,0)`;
      const r = e.overtaking.rankOf(c.id);
      if (lastRank.current[c.id] !== r) {
        lastRank.current[c.id] = r;
        const lab = ranks.current[c.id];
        if (lab) lab.textContent = ordinal(r);
      }
    }
    offset.current = (offset.current + e.player.speed * dt * 2.2) % 48;
    const el = wrap.current;
    if (el) {
      el.style.setProperty('--road-x', `${-offset.current}px`);
      el.style.setProperty('--speed', String(clamp(e.player.speed / maxSpeed(), 0, 1)));
    }
  };

  useImperativeHandle(ref, () => ({ render }), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => { width.current = el.clientWidth || 900; render(engine, 0); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [engine]); // eslint-disable-line react-hooks/exhaustive-deps

  const n = engine.cars.length;
  const goal = engine.modeCfg.end === 'distance';
  return (
    <div className="neon-card rounded-2xl bg-ink-900/90 p-3 sm:p-4">
      <div ref={wrap} className="track-wrap relative overflow-hidden rounded-xl bg-[#0c111d]" style={{ height: n * LANE_H }}
        role="img" aria-label="Race track">
        {Array.from({ length: n }, (_, i) => (
          <div key={i} className="absolute left-0 right-0" style={{ top: i * LANE_H, height: LANE_H, background: i % 2 ? 'rgba(255,255,255,.015)' : 'rgba(255,255,255,.035)' }} />
        ))}
        {Array.from({ length: n - 1 }, (_, i) => (
          <div key={i} className="lane-dash absolute left-0 right-0" style={{ top: (i + 1) * LANE_H - 1 }} />
        ))}
        <div className="speed-lines pointer-events-none absolute inset-0" />
        <div className="absolute inset-y-0 bg-white/80" style={{ left: PAD, width: 3 }} />
        <span className="absolute left-1 top-1 -rotate-0 text-[9px] font-bold tracking-widest text-white/50">START</span>
        {goal ? (
          <>
            <div className="finish-line absolute inset-y-0" style={{ right: PAD - 14, width: 14 }} />
            <span className="absolute right-1 top-1 text-[9px] font-bold tracking-widest text-white/50">FINISH</span>
          </>
        ) : (
          <span className="absolute right-2 top-1 text-[9px] font-bold tracking-widest text-white/40">
            {engine.modeCfg.end === 'time' ? 'TIME TRIAL' : 'PRACTICE'}
          </span>
        )}
        {engine.cars.map((c) => (
          <div key={c.id} ref={(el) => { cars.current[c.id] = el; }} className="car absolute left-0" style={{ top: c.lane * LANE_H + 14, width: CAR_W }}>
            <div className="mb-0.5 flex items-center gap-1 whitespace-nowrap text-[10px] font-semibold leading-none" style={{ color: c.color }}>
              <span ref={(el) => { ranks.current[c.id] = el; }} className="rounded bg-black/50 px-1 py-0.5">1st</span>
              <span className={c.isPlayer ? 'text-white' : 'opacity-80'}>{c.isPlayer ? 'YOU' : c.name.split(' ')[0]}</span>
            </div>
            <CarSprite color={c.color} isPlayer={c.isPlayer} />
          </div>
        ))}
      </div>
    </div>
  );
}));
