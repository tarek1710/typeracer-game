import { useState } from 'react';
import { LineChart } from './LineChart';
import { TrashIcon } from './icons';
import { MODES } from '../game/config';
import type { Progress } from '../game/storage';
import type { GameMode } from '../game/types';

const Card = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="rounded-xl bg-black/30 px-3 py-3">
    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
    <div className="font-display text-2xl font-bold tabular-nums">{value}</div>
    {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
  </div>
);

export function ProgressDashboard({ progress, onReset, onBack }: { progress: Progress; onReset: () => void; onBack: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const last = progress.races.slice(-30);
  const avg = progress.totalRaces ? progress.wpmSum / progress.totalRaces : 0;
  const pb = progress.personalBest;
  return (
    <main className="mx-auto w-full max-w-5xl px-3 pb-10 pt-4 sm:px-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold neon-text">My progress</h1>
        <button onClick={onBack} className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15">Back</button>
      </div>
      <p className="mb-3 text-xs text-slate-500">Stored only in this browser (localStorage). No account, no cloud sync.</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card label="Total races" value={String(progress.totalRaces)} />
        <Card label="Wins" value={String(progress.wins)} sub={progress.totalRaces ? `${Math.round((progress.wins / progress.totalRaces) * 100)}% of races` : undefined} />
        <Card label="Best WPM" value={progress.bestWpm.toFixed(1)} />
        <Card label="Average WPM" value={avg.toFixed(1)} />
        <Card label="Best accuracy" value={`${progress.bestAccuracy.toFixed(1)}%`} />
        <Card label="Calibrated skill" value={progress.skillWpm ? `${progress.skillWpm} WPM` : '—'} sub="rivals are scaled to this" />
        <Card label="Personal best" value={pb ? `${pb.wpm.toFixed(1)} WPM` : '—'} sub={pb ? `${pb.accuracy.toFixed(0)}% · ${MODES[pb.mode as GameMode]?.label ?? pb.mode} · ${new Date(pb.t).toLocaleDateString()}` : undefined} />
        <Card label="Adaptive offset" value={`${progress.adaptiveOffset >= 0 ? '+' : ''}${(progress.adaptiveOffset * 100).toFixed(0)}%`} sub="only used if Adaptive is on" />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <LineChart title="WPM — last 30 races" data={last.map((r) => r.wpm)} unit="" color="#22d3ee" />
        <LineChart title="Accuracy — last 30 races" data={last.map((r) => r.accuracy)} unit="%" color="#34d399" max={100} min={Math.max(0, Math.floor(Math.min(100, ...last.map((r) => r.accuracy)) - 5))} />
      </div>
      <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wider text-slate-400">Recent races</h2>
      <div className="overflow-x-auto rounded-xl bg-black/30">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="text-xs text-slate-400"><tr><th className="p-2">Date</th><th className="p-2">Mode</th><th className="p-2">WPM</th><th className="p-2">Acc.</th><th className="p-2">Result</th></tr></thead>
          <tbody>
            {progress.races.slice(-10).reverse().map((r) => (
              <tr key={r.t} className="border-t border-white/5">
                <td className="p-2">{new Date(r.t).toLocaleString()}</td>
                <td className="p-2">{MODES[r.mode as GameMode]?.label ?? r.mode}</td>
                <td className="p-2 tabular-nums">{r.wpm.toFixed(1)}</td>
                <td className="p-2 tabular-nums">{r.accuracy.toFixed(1)}%</td>
                <td className="p-2">{r.cars > 1 ? `${r.position}/${r.cars}${r.won ? ' 🏆' : ''}` : '—'}</td>
              </tr>
            ))}
            {progress.races.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-slate-500">No races yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-6">
        {confirm ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-red-500/10 p-3 text-sm">
            <span>Erase all local statistics? (Your calibrated skill is kept.)</span>
            <button onClick={() => { onReset(); setConfirm(false); }} className="rounded-lg bg-red-500 px-3 py-1.5 font-semibold text-white">Yes, reset</button>
            <button onClick={() => setConfirm(false)} className="rounded-lg bg-white/10 px-3 py-1.5">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirm(true)} className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-red-500/20"><TrashIcon size={16} /> Reset statistics</button>
        )}
      </div>
    </main>
  );
}
