import { useState } from 'react';
import { DumbbellIcon, FileTextIcon, FlagIcon, GaugeIcon, PlayIcon, TargetIcon, TimerIcon, ZapIcon } from './icons';
import { MODES } from '../game/config';
import { cleanCustomText } from '../game/texts';
import type { Progress } from '../game/storage';
import type { Category, GameMode } from '../game/types';

export interface RaceOptions { mode: GameMode; category: Category; timeLimit: number; customText: string }

const MODE_ICON: Record<GameMode, JSX.Element> = {
  quick: <ZapIcon size={22} />, classic: <FlagIcon size={22} />, timetrial: <TimerIcon size={22} />,
  accuracy: <TargetIcon size={22} />, practice: <DumbbellIcon size={22} />, custom: <FileTextIcon size={22} />,
};
const CATEGORIES: { id: Category; label: string; hint: string }[] = [
  { id: 'beginner', label: 'Beginner', hint: 'simple words' },
  { id: 'intermediate', label: 'Intermediate', hint: 'everyday sentences' },
  { id: 'advanced', label: 'Advanced', hint: 'long, complex' },
  { id: 'professional', label: 'Professional', hint: 'numbers & punctuation' },
  { id: 'programming', label: 'Programming', hint: 'code & concepts' },
  { id: 'bangla', label: 'বাংলা Bangla', hint: 'Unicode / IME' },
  { id: 'custom', label: 'Custom', hint: 'your own text' },
];
const MODE_ORDER: GameMode[] = ['quick', 'classic', 'timetrial', 'accuracy', 'practice', 'custom'];

export function MenuScreen({ options, onOptions, progress, onStart, onCalibrate, onProgress }: {
  options: RaceOptions; onOptions: (o: RaceOptions) => void; progress: Progress;
  onStart: () => void; onCalibrate: () => void; onProgress: () => void;
}) {
  const [touched, setTouched] = useState(false);
  const customLen = cleanCustomText(options.customText).length;
  const needsCustom = options.category === 'custom' || options.mode === 'custom';
  const customOk = !needsCustom || customLen >= 20;
  const set = (p: Partial<RaceOptions>) => onOptions({ ...options, ...p });
  const pickMode = (mode: GameMode) =>
  set({
    mode,
    category:
      options.category === 'custom' ? 'intermediate' : options.category,
  });
  return (
    <main className="mx-auto w-full max-w-5xl px-3 pb-12 pt-6 sm:px-4">
      <section className="mb-6">
        <h1 className="font-display text-3xl font-black neon-text sm:text-4xl">Type faster. Drive faster.</h1>
        <p className="mt-2 max-w-2xl text-slate-400">Your typing speed is your throttle. Type accurately to push your car past rivals — every pass comes from real speed and distance, never from a trick.</p>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section aria-label="Game mode">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">1 · Choose a mode</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {MODE_ORDER.map((id) => {
              const m = MODES[id];
              const on = options.mode === id;
              return (
                <button key={id} onClick={() => pickMode(id)} aria-pressed={on}
                  className={`flex items-start gap-3 rounded-xl p-3 text-left transition ${on ? 'bg-cyan-400/15 ring-2 ring-cyan-400' : 'bg-ink-800 ring-1 ring-white/10 hover:ring-white/30'}`}>
                  <span className={`mt-0.5 ${on ? 'text-cyan-300' : 'text-slate-400'}`}>{MODE_ICON[id]}</span>
                  <span><span className="block font-semibold">{m.label}</span><span className="text-xs text-slate-400">{m.description}</span></span>
                </button>
              );
            })}
          </div>

          {options.mode === 'timetrial' && (
            <div className="mt-3 flex items-center gap-2" role="radiogroup" aria-label="Time trial length">
              <span className="text-sm text-slate-400">Length:</span>
              {[30, 60, 120].map((s) => (
                <button key={s} role="radio" aria-checked={options.timeLimit === s} onClick={() => set({ timeLimit: s })}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${options.timeLimit === s ? 'bg-cyan-400 text-slate-950' : 'bg-white/10'}`}>{s}s</button>
              ))}
            </div>
          )}

          <h2 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">2 · Text category</h2>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Text category">
            {CATEGORIES.map((c) => {
              const locked = options.mode === 'custom' && c.id !== 'custom';
              return (
                <button key={c.id} role="radio" aria-checked={options.category === c.id} disabled={locked} title={c.hint}
                  onClick={() => set({ category: c.id })}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${options.category === c.id ? 'bg-fuchsia-400 text-slate-950' : 'bg-white/10 hover:bg-white/15'} disabled:opacity-30`}>{c.label}</button>
              );
            })}
          </div>
          {options.category === 'bangla' && (
            <p className="mt-2 rounded-lg bg-amber-400/10 p-2 text-xs text-amber-200">Bangla needs a Bangla keyboard layout or IME (e.g. Avro, OS Bangla keyboard). Text is compared as Unicode code points after NFC normalisation; IME composition is only counted when committed. Layouts differ, so please report any key that doesn't register.</p>
          )}
          {needsCustom && (
            <div className="mt-3">
              <label htmlFor="custom-text" className="mb-1 block text-sm text-slate-400">Your passage (20–1000 characters, line breaks become spaces)</label>
              <textarea id="custom-text" value={options.customText} onChange={(e) => { setTouched(true); set({ customText: e.target.value.slice(0, 2000) }); }} rows={4}
                className="w-full rounded-xl border border-white/15 bg-ink-950 p-3 font-mono text-sm outline-none focus:border-cyan-400" placeholder="Paste or type the text you want to practice…" />
              {touched && !customOk && <p className="text-xs text-red-300">Please enter at least 20 characters ({customLen} so far).</p>}
            </div>
          )}
        </section>

        <aside className="space-y-3" aria-label="Your level">
          <div className="neon-card rounded-2xl bg-ink-900/90 p-4">
            <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><GaugeIcon size={14} /> Your calibrated speed</h2>
            {progress.skillWpm ? (
              <p className="font-display text-3xl font-bold text-cyan-300">{progress.skillWpm} <span className="text-base text-slate-400">WPM</span></p>
            ) : (
              <p className="text-sm text-amber-300">Not calibrated yet — a 20-second test sets fair rival speeds.</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={onCalibrate} className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15">{progress.skillWpm ? 'Recalibrate' : 'Take calibration test'}</button>
              <button onClick={onProgress} className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15">My progress</button>
            </div>
          </div>
          <div className="neon-card rounded-2xl bg-ink-900/90 p-4 text-sm text-slate-300">
            <p><b>{progress.totalRaces}</b> races · <b>{progress.wins}</b> wins · best <b>{progress.bestWpm.toFixed(0)}</b> WPM</p>
            <p className="mt-2 text-xs text-slate-500">Tip: change difficulty in the top bar. Esc pauses during a race.</p>
          </div>
          <button onClick={() => { setTouched(true); if (customOk) onStart(); }} disabled={!customOk}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-fuchsia-400 px-5 py-4 font-display text-lg font-bold text-slate-950 shadow-lg shadow-cyan-500/20 hover:brightness-110 disabled:opacity-40">
            <PlayIcon /> {progress.skillWpm ? 'START RACE' : 'CALIBRATE & RACE'}
          </button>
        </aside>
      </div>
    </main>
  );
}
