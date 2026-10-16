import { memo, useEffect, useReducer, useRef, useState } from 'react';
import { PassageText } from './PassageText';
import { audio } from '../game/audio';
import type { RaceEngine } from '../game/RaceStateManager';
import type { RacePhase } from '../game/types';

const NAV_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Delete', 'PageUp', 'PageDown']);

/**
 * The text you type, shown at the bottom of the screen: the current passage with the
 * following passages queued below it. Typing goes through a hidden input that is
 * always focused, so the passage itself is the only thing you look at.
 */
export const TypingPanel = memo(function TypingPanel({ engine, phase, lang }: {
  engine: RaceEngine; phase: RacePhase; lang?: string;
}) {
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const input = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const [focused, setFocused] = useState(true);
  const [shake, setShake] = useState(false);
  const shakeTimer = useRef<number | undefined>(undefined);
  const active = phase === 'racing';

  useEffect(() => { if (active) input.current?.focus(); }, [active]);
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
      audio.tick();
    }
    bump();
  };

  const t = engine.typing;
  const lock = () => { const el = input.current; if (el) el.setSelectionRange(el.value.length, el.value.length); };

  return (
    <section
     className={`neon-card relative min-w-0 flex-1 cursor-text overflow-hidden rounded-2xl bg-ink-900/90 px-3 py-2 sm:px-4 ${shake ? 'shake' : ''}`}
      style={{ maxHeight: '30dvh' }}
      onClick={() => input.current?.focus()}
    >
      <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(t.passagePercent)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-cyan-400 transition-[width] duration-100" style={{ width: `${t.passagePercent}%` }} />
      </div>
      <div className={active ? '' : 'opacity-60'}>
        <PassageText chars={t.targetChars} states={t.charStates()} lang={lang} />
           {engine.upcoming.map((p, i) => (
             <p key={`${i}-${p.slice(0, 12)}`} lang={lang} className="mt-2 select-none whitespace-pre-wrap break-words font-mono text-xl leading-8 text-slate-600 sm:text-2xl" style={{ opacity: 1 - i * 0.3 }}>{p}</p>
        ))}
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
        className="absolute left-0 top-0 h-px w-px opacity-0"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.repeat && e.key !== 'Backspace') e.preventDefault(); // held keys never add speed
          if (NAV_KEYS.has(e.key) || ((e.ctrlKey || e.metaKey) && e.key !== 'Backspace' && e.key.length === 1)) e.preventDefault();
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
        <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-amber-300">Click here to keep typing</div>
      )}
      {phase === 'countdown' && (
        <div className="absolute inset-x-0 bottom-1 text-center text-xs text-slate-500">Get ready…</div>
      )}
    </section>
  );
});
