import { forwardRef, memo, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { CarSprite } from './CarSprite';
import { maxSpeed } from '../game/RacingPhysics';
import { clamp } from '../game/rng';
import type { RaceEngine } from '../game/RaceStateManager';

export interface RaceTrackHandle { render: (engine: RaceEngine, dt: number) => void }

const PAD = 40; // inset of start / finish line from the edges
const ordinal = (n: number) => `${n}${n % 100 > 10 && n % 100 < 14 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;

/**
 * DOM-based track that fills the space it is given. Car positions are written straight to
 * element transforms from the game loop (no React re-render per frame). x position =
 * progress along the track, derived from each car's integrated distance.
 */
export const RaceTrack = memo(forwardRef<RaceTrackHandle, { engine: RaceEngine }>(function RaceTrack({ engine }, ref) {
  const wrap = useRef<HTMLDivElement>(null);
  const cars = useRef<Record<string, HTMLDivElement | null>>({});
  const ranks = useRef<Record<string, HTMLSpanElement | null>>({});
  const offset = useRef(0);
  const lastRank = useRef<Record<string, number>>({});
  const [dim, setDim] = useState({ w: 900, h: 420 });
  const n = engine.cars.length;
  const laneH = dim.h / n;
  const carW = Math.round(Math.max(70, Math.min(laneH * 1.9, 210, dim.w * 0.2)));
  const carH = carW * 0.44;
  const geo = useRef({ w: dim.w, carW });
  geo.current = { w: dim.w, carW };

  const render = (e: RaceEngine, dt: number) => {
    const { w, carW: cw } = geo.current;
    const start = PAD;
    const end = w - PAD - cw;
    for (const c of e.cars) {
      const el = cars.current[c.id];
      if (!el) continue;
      const frac = e.progressOf(c);
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
    const measure = () => setDim({ w: el.clientWidth || 900, h: el.clientHeight || 420 });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => { render(engine, 0); }, [dim, engine]); // eslint-disable-line react-hooks/exhaustive-deps

  const goal = engine.modeCfg.end === 'distance';
  const lineX = PAD + carW + 6; // start line just ahead of the cars' noses
  return (
    <div ref={wrap} className="track-wrap neon-card absolute inset-0 overflow-hidden rounded-2xl bg-[#0c111d]" role="img" aria-label="Race track">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="absolute left-0 right-0" style={{ top: i * laneH, height: laneH, background: i % 2 ? 'rgba(255,255,255,.015)' : 'rgba(255,255,255,.04)' }} />
      ))}
      {Array.from({ length: n - 1 }, (_, i) => (
        <div key={i} className="lane-dash absolute left-0 right-0" style={{ top: (i + 1) * laneH - 1 }} />
      ))}
      <div className="speed-lines pointer-events-none absolute inset-0" />
      <div className="absolute inset-y-0 bg-white/80" style={{ left: lineX, width: 3 }} />
      <span className="absolute top-1 text-[10px] font-bold tracking-widest text-white/50" style={{ left: lineX + 6 }}>START</span>
      {goal ? (
        <>
          <div className="finish-line absolute inset-y-0" style={{ right: PAD - 14, width: 14 }} />
          <span className="absolute right-1 top-1 text-[10px] font-bold tracking-widest text-white/60">FINISH</span>
        </>
      ) : (
        <span className="absolute right-2 top-1 text-[10px] font-bold tracking-widest text-white/40">
          {engine.modeCfg.end === 'time' ? 'TIME TRIAL' : 'PRACTICE'}
        </span>
      )}
      {engine.cars.map((c) => (
        <div key={c.id} ref={(el) => { cars.current[c.id] = el; }} className="car absolute left-0"
          style={{ top: c.lane * laneH + (laneH - carH - 16) / 2, width: carW }}>
          <div className="mb-0.5 flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold leading-none" style={{ color: c.color }}>
            <span ref={(el) => { ranks.current[c.id] = el; }} className="rounded bg-black/60 px-1 py-0.5">1st</span>
            <span className={c.isPlayer ? 'text-white' : 'opacity-90'}>{c.isPlayer ? 'YOU' : c.name.split(' ')[0]}</span>
            {c.tag && <span className="text-white/60">{c.tag}</span>}
          </div>
          <CarSprite color={c.color} kind={c.kind} />
        </div>
      ))}
    </div>
  );
}));
