import { memo } from 'react';
import type { RaceSnapshot } from '../game/RaceStateManager';

const Tile = ({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) => (
  <div className="rounded-xl bg-black/30 px-3 py-2.5">
    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
    <div className="font-display text-xl font-bold tabular-nums sm:text-2xl" style={accent ? { color: accent } : undefined}>{value}</div>
    {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
  </div>
);

const ord = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export const StatsPanel = memo(function StatsPanel({ snap, solo, timed }: { snap: RaceSnapshot; solo: boolean; timed: boolean }) {
  const m = snap.metrics;
  const remaining = Math.max(0, snap.trackLength - snap.distance);
  return (
    <section className="neon-card rounded-2xl bg-ink-900/90 p-3 sm:p-4" aria-label="Race statistics">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Current WPM" value={m.currentWpm.toFixed(0)} accent="#22d3ee" sub={`${snap.speedKmh.toFixed(0)} km/h`} />
        <Tile label="Average WPM" value={m.averageWpm.toFixed(0)} sub={`peak ${m.peakWpm.toFixed(0)}`} />
        <Tile label="Accuracy" value={`${m.accuracy.toFixed(1)}%`} accent={m.accuracy >= 95 ? '#34d399' : m.accuracy >= 85 ? '#fbbf24' : '#f87171'} />
        <Tile label="Errors" value={String(m.errors)} sub={`${m.totalKeystrokes} keystrokes`} />
        {!solo && <Tile label="Position" value={`${ord(snap.playerRank)}/${snap.totalCars}`} accent="#a78bfa" />}
        {!solo && <Tile label="Overtaken" value={String(snap.uniqueOvertaken)} sub={`${snap.overtakes} passes`} />}
        {timed ? (
          <Tile label="Time left" value={fmtTime(snap.timeLeft ?? 0)} accent="#fbbf24" />
        ) : (
          <Tile label={solo ? 'Distance' : 'Progress'} value={solo ? `${snap.distance.toFixed(0)} m` : `${snap.progressPct.toFixed(0)}%`} sub={solo ? undefined : `${remaining.toFixed(0)} m to go`} />
        )}
        <Tile label="Time" value={fmtTime(snap.time)} />
      </div>
    </section>
  );
});
