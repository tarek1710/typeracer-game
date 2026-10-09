import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { PassageText } from './PassageText';
import { TypingEngine } from '../game/TypingEngine';
import { createPassageProvider } from '../game/texts';
import { accuracyPercent } from '../game/AccuracyCalculator';
import { wpmFromChars } from '../game/WPMCalculator';

const DURATION = 20;
const PRESETS = [{ label: 'Beginner', wpm: 15 }, { label: 'Intermediate', wpm: 40 }, { label: 'Advanced', wpm: 80 }];

export function CalibrationScreen({ onDone, onCancel }: { onDone: (wpm: number) => void; onCancel: () => void }) {
  const next = useMemo(() => createPassageProvider('intermediate', Math.random, { persist: false }), []);
  const engine = useRef(new TypingEngine(next()));
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const [state, setState] = useState<'ready' | 'running' | 'done'>('ready');
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<{ wpm: number; acc: number } | null>(null);
  const startedAt = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const composing = useRef(false);

  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => {
    if (state !== 'running') return;
    const id = window.setInterval(() => {
      const s = (performance.now() - startedAt.current) / 1000;
      setElapsed(Math.min(s, DURATION));
      if (s >= DURATION) {
        window.clearInterval(id);
        const t = engine.current;
        setResult({ wpm: wpmFromChars(t.progressChars, DURATION), acc: accuracyPercent(t.correctKeystrokes, t.totalKeystrokes) });
        setState('done');
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [state]);

  const submit = (v: string, committed: boolean) => {
    if (state === 'done') return;
    const now = performance.now() / 1000;
    const res = engine.current.applyInput(v, now, { committed });
    if (input.current && input.current.value !== res.value) input.current.value = res.value;
    if (res.accepted > 0 && state === 'ready') { startedAt.current = performance.now(); setState('running'); }
    if (res.passageCompleted) { engine.current.rollover(next()); if (input.current) input.current.value = ''; }
    bump();
  };

  const t = engine.current;
  return (
    <main className="mx-auto w-full max-w-3xl px-3 pb-10 pt-6 sm:px-4">
      <h1 className="font-display text-2xl font-bold neon-text">Speed calibration</h1>
      <p className="mt-1 text-sm text-slate-400">Type for {DURATION} seconds at your normal pace. Rivals are scaled to this result, so a beginner and a pro both get a fair race. The timer starts with your first keystroke.</p>
      <div className="neon-card mt-4 rounded-2xl bg-ink-900/90 p-4 sm:p-5">
        <div className="mb-3 flex justify-between text-sm text-slate-400">
          <span>{state === 'ready' ? 'Start typing to begin' : state === 'running' ? 'Typing…' : 'Done'}</span>
          <span className="tabular-nums">{Math.max(0, DURATION - elapsed).toFixed(1)}s</span>
        </div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-cyan-400" style={{ width: `${(elapsed / DURATION) * 100}%` }} /></div>
        <div className="rounded-xl bg-black/30 p-3"><PassageText chars={t.targetChars} states={t.charStates()} /></div>
        <input ref={input} disabled={state === 'done'} autoFocus autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
          aria-label="Calibration typing input" placeholder="Type here…"
          className="mt-3 w-full rounded-xl border border-white/15 bg-ink-950 px-4 py-3 font-mono text-lg outline-none focus:border-cyan-400 disabled:opacity-50"
          onKeyDown={(e) => { if (e.repeat && e.key !== 'Backspace') e.preventDefault(); }}
          onPaste={(e) => e.preventDefault()} onDrop={(e) => e.preventDefault()}
          onCompositionStart={() => { composing.current = true; }}
          onCompositionEnd={(e) => { composing.current = false; submit(e.currentTarget.value, true); }}
          onInput={(e) => { const ne = e.nativeEvent as InputEvent; if (ne.inputType === 'insertFromPaste' || ne.isComposing || composing.current) return; submit(e.currentTarget.value, false); }} />
        {result && (
          <div className="pop mt-4 rounded-xl bg-cyan-400/10 p-4 ring-1 ring-cyan-400/40">
            <p className="text-lg"><b className="font-display text-2xl text-cyan-300">{result.wpm.toFixed(0)} WPM</b> at {result.acc.toFixed(0)}% accuracy</p>
            {result.wpm < 8 && <p className="text-xs text-amber-300">That is very low, so we will use a minimum of 8 WPM for rival scaling.</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => onDone(result.wpm)} className="rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300">Use this result</button>
              <button onClick={() => { engine.current = new TypingEngine(next()); if (input.current) { input.current.value = ''; input.current.focus(); } setResult(null); setElapsed(0); setState('ready'); }} className="rounded-xl bg-white/10 px-4 py-2 font-semibold hover:bg-white/15">Try again</button>
            </div>
          </div>
        )}
      </div>
      <div className="mt-5 rounded-xl bg-black/30 p-4">
        <p className="mb-2 text-sm text-slate-400">Already know your speed? Pick a starting level (it keeps updating from your races):</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => <button key={p.label} onClick={() => onDone(p.wpm)} className="rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/15">{p.label} · {p.wpm} WPM</button>)}
          <button onClick={onCancel} className="ml-auto rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
        </div>
      </div>
    </main>
  );
}
