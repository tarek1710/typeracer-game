import type { RaceResult } from '../game/types';
import { MODES } from '../game/config';
import { ChartIcon, HomeIcon, RestartIcon, TrophyIcon } from './icons';

const ord = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;
const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-black/30 px-3 py-2">
    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
    <div className="font-display text-lg font-bold tabular-nums">{value}</div>
  </div>
);

export function ResultsDashboard({ result, onPlayAgain, onHome, onProgress }: {
  result: RaceResult; onPlayAgain: () => void; onHome: () => void; onProgress: () => void;
}) {
  const solo = result.totalCars === 1;
  const title = solo
    ? result.reason === 'time' ? "Time's up!" : 'Session complete'
    : result.playerWon ? 'Victory!' : result.finalPosition <= 3 ? 'Podium finish' : 'Race complete';
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Race results">
      <div className="pop neon-card my-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-ink-900 p-5 sm:p-7">
        <div className="mb-4 flex items-center gap-3">
          <TrophyIcon size={30} className={result.playerWon ? 'text-amber-300' : 'text-slate-400'} />
          <div>
            <h2 className="font-display text-2xl font-bold neon-text">{title}</h2>
            <p className="text-sm text-slate-400">
              {MODES[result.mode].label}
              {!solo && <> · Winner: <span className="text-white">{result.winnerName}</span> · You finished <span className="text-cyan-300">{ord(result.finalPosition)}</span> of {result.totalCars}</>}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Final WPM" value={result.finalWpm.toFixed(1)} />
          <Stat label="Average WPM" value={result.averageWpm.toFixed(1)} />
          <Stat label="Peak WPM" value={result.peakWpm.toFixed(1)} />
          <Stat label="Accuracy" value={`${result.accuracy.toFixed(1)}%`} />
          <Stat label="Errors" value={String(result.errors)} />
          <Stat label="Duration" value={fmt(result.duration)} />
          <Stat label={solo ? 'Distance' : 'Overtaken'} value={solo ? `${result.distance.toFixed(0)} m` : `${result.uniqueOvertaken} (${result.overtakes} passes)`} />
          <Stat label="Correct chars" value={String(result.correctChars)} />
        </div>
        {!solo && (
          <ol className="mt-4 space-y-1.5" aria-label="Final standings">
            {result.standings.map((s) => (
              <li key={s.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${s.isPlayer ? 'bg-cyan-400/10 ring-1 ring-cyan-400/40' : 'bg-white/5'}`}>
                <span className="w-6 font-display font-bold text-slate-300">{s.rank}</span>
                <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                <span className="flex-1 font-medium">{s.isPlayer ? 'You' : s.name}</span>
                <span className="tabular-nums text-slate-400">{s.finished && s.finishTime !== null ? fmt(s.finishTime) : `${s.progressPct.toFixed(0)}% — not finished`}</span>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={onPlayAgain} className="flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 font-semibold text-slate-950 hover:bg-cyan-300"><RestartIcon /> Play again</button>
          <button onClick={onHome} className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold hover:bg-white/15"><HomeIcon /> Menu</button>
          <button onClick={onProgress} className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold hover:bg-white/15"><ChartIcon /> My progress</button>
        </div>
      </div>
    </div>
  );
}
