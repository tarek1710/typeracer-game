import { memo, useEffect, useReducer, useRef, useState } from 'react';
import { PassageText } from './PassageText';
import { audio } from '../game/audio';
import type { RaceEngine } from '../game/RaceStateManager';
import type { RacePhase } from '../game/types';
import { KeyboardIcon } from './icons';

const NAV_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Delete', 'PageUp', 'PageDown']);

export const TypingPanel = memo(function TypingPanel({ engine, phase, lang, sound }: {
  engine: RaceEngine; phase: RacePhase; lang?: string; sound: boolean;
}) {
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const input = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const [focused, setFocused] = useState(true);
  const [shake, setShake] = useState(false);
  const shakeTimer = useRef<number | undefined>(undefined);
  const active = phase === 'racing';

  useEffect(() => {
    if (active) { input.current?.focus(); }
  }, [active]);
  useEffect(() => () => window.clearTimeout(shakeTimer.current), []);
  useEffect(() => engine.on('passage', () => { if (input.current) input.current.value = ''; bump(); }), [engine]);

  const submit = (value: string, flags: { committed?: boolean; pasted?: boolean }) => {
    const el = input.current;
    if (!el) return;
    const res = engine.typeInput(value, flags, performance.now() / 1000);
    if (el.value !== res.value) el.value = res.value;
    if (res.accepted > 0) {
      if (res.keystrokes.includes(false)) {
        setShake(true);
        window.clearTimeout(shakeTimer.current);
        shakeTimer.current = window.setTimeout(() => setShake(false), 200);
      }
      else if (sound) audio.tick();
    }
    bump();
  };

  const t = engine.typing;
  const m = engine.metrics();
  const lock = () => { const el = input.current; if (el) el.setSelectionRange(el.value.length, el.value.length); };

  return (
    <section className="neon-card rounded-2xl bg-ink-900/90 p-4 sm:p-5" onClick={() => input.current?.focus()}>
      <div className="mb-3 flex items-center justify-between gap-3 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><KeyboardIcon size={14} /> Type the text below</span>
        <span>{t.remaining} chars left · {m.correctChars} correct</span>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(m.passageProgress)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-cyan-400 transition-[width] duration-100" style={{ width: `${m.passageProgress}%` }} />
      </div>
      <div className={`rounded-xl bg-black/30 p-3 sm:p-4 ${active ? '' : 'opacity-60'}`}>
        <PassageText chars={t.targetChars} states={t.charStates()} lang={lang} />
      </div>
      <input
        ref={input}
        type="text"
        lang={lang}
        disabled={!active}
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="done"
        aria-label="Typing input"
        placeholder={phase === 'racing' ? 'Start typing…' : phase === 'paused' ? 'Paused' : phase === 'finished' ? 'Race over' : 'Get ready…'}
        className={`mt-3 w-full rounded-xl border bg-ink-950 px-4 py-3 font-mono text-lg text-white outline-none placeholder:text-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 disabled:opacity-50 ${shake ? 'shake border-red-400/60' : 'border-white/15'}`}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.repeat && e.key !== 'Backspace') e.preventDefault(); // held keys never add speed
          if (NAV_KEYS.has(e.key) || ((e.ctrlKey || e.metaKey) && !['Backspace'].includes(e.key) && e.key.length === 1)) e.preventDefault();
        }}
        onPaste={(e) => { e.preventDefault(); engine.typeInput('', { pasted: true }); }}
        onDrop={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onSelect={lock}
        onCompositionStart={() => { composing.current = true; }}
        onCompositionEnd={(e) => { composing.current = false; submit(e.currentTarget.value, { committed: true }); }}
        onInput={(e) => {
          const ne = e.nativeEvent as InputEvent;
          if (ne.inputType === 'insertFromPaste' || ne.inputType === 'insertFromDrop') {
            engine.typeInput('', { pasted: true });
            if (input.current) input.current.value = t.typedString;
            return;
          }
          if (ne.isComposing || composing.current) return; // wait for the IME to commit
          submit(e.currentTarget.value, {});
        }}
      />
      {active && !focused && (
        <p className="mt-2 text-center text-xs text-amber-300">Click here to keep typing</p>
      )}
    </section>
  );
});
