import { memo } from 'react';
import type { CharState } from '../game/TypingEngine';

const cls: Record<CharState, string> = {
  correct: 'ch-correct', wrong: 'ch-wrong', current: 'ch-current', pending: 'ch-pending',
};

/** Renders a passage with per-character feedback. Memoised: only re-renders when states change. */
export const PassageText = memo(function PassageText({ chars, states, lang }: { chars: string[]; states: CharState[]; lang?: string }) {
  return (
        <p lang={lang} className="font-mono text-2xl leading-9 sm:text-3xl sm:leading-[3rem] whitespace-pre-wrap break-words select-none" aria-label="Passage to type">
      {chars.map((ch, i) => (
        <span key={i} className={cls[states[i]]}>{ch}</span>
      ))}
    </p>
  );
});