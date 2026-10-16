import { TYPING } from './config';

export interface InputFlags {
  pasted?: boolean; // paste / drop: always rejected
  composing?: boolean; // IME composition in progress: deferred
  committed?: boolean; // result of an IME composition commit (may insert several chars)
}

export interface InputResult {
  value: string; // what the input element should now contain
  accepted: number;
  rejected: number;
  backspaces: number;
  keystrokes: boolean[]; // correctness of each accepted keystroke
  passageCompleted: boolean;
  blocked?: 'paste' | 'rate' | 'overrun' | 'chunk' | 'overflow';
  deferred?: boolean;
}

export type CharState = 'correct' | 'wrong' | 'current' | 'pending';

const norm = (s: string) => Array.from(s.normalize('NFC'));

/**
 * Pure typing logic: diffs the input value against what was typed before, judges
 * every inserted code point against the target, and exposes counters. Characters are
 * compared as NFC-normalised code points so Bangla (and other composed scripts) work.
 */
export class TypingEngine {
  private target: string[] = [];
  private typed: string[] = [];
  completedChars = 0;
  totalKeystrokes = 0;
  correctKeystrokes = 0;
  errors = 0;
  backspaces = 0;
  pasteBlocked = 0;
  rateBlocked = 0;
  private lastInsertT = -Infinity;

  constructor(passage: string, private opts = { minKeyInterval: TYPING.minKeyInterval, maxOverrun: TYPING.maxOverrun }) {
    this.target = norm(passage);
  }

  get targetString() { return this.target.join(''); }
  get targetChars() { return this.target; }
  get typedString() { return this.typed.join(''); }
  get typedLength() { return this.typed.length; }
  get length() { return this.target.length; }
  expectedChar(): string | undefined { return this.target[this.typed.length]; }

  firstErrorIndex(): number {
    for (let i = 0; i < this.typed.length; i++) if (this.typed[i] !== this.target[i]) return i;
    return -1;
  }

  /** Length of the error-free prefix: the characters that count as correctly typed. */
  get prefixCorrect(): number {
    const e = this.firstErrorIndex();
    return e === -1 ? this.typed.length : e;
  }

  /** Cumulative correct characters across all passages in this race. */
  get progressChars() { return this.completedChars + this.prefixCorrect; }
  get remaining() { return this.target.length - this.prefixCorrect; }
  get passagePercent() { return this.target.length ? (this.prefixCorrect / this.target.length) * 100 : 0; }

  charStates(): CharState[] {
    const e = this.firstErrorIndex();
    return this.target.map((_, i) => {
      if (i < this.typed.length) return e !== -1 && i >= e ? 'wrong' : 'correct';
      return i === this.typed.length ? 'current' : 'pending';
    });
  }

  rollover(nextPassage: string) {
    this.completedChars += this.prefixCorrect;
    this.target = norm(nextPassage);
    this.typed = [];
  }

  private result(partial: Partial<InputResult> = {}): InputResult {
    return {
      value: this.typedString, accepted: 0, rejected: 0, backspaces: 0, keystrokes: [],
      passageCompleted: false, ...partial,
    };
  }

  noop(): InputResult { return this.result(); }

  /**
   * @param raw   the input element's current value
   * @param now   monotonic seconds, used only for the artificial-speed limiter
   */
  applyInput(raw: string, now: number, flags: InputFlags = {}): InputResult {
    if (flags.pasted) {
      this.pasteBlocked++;
      return this.result({ blocked: 'paste' });
    }
    if (flags.composing) return this.result({ value: raw, deferred: true });

    const next = norm(raw);
    const prev = this.typed;
    let p = 0;
    while (p < prev.length && p < next.length && prev[p] === next[p]) p++;
    const deletions = prev.length - p;
    const inserts = next.slice(p);

    const maxChunk = flags.committed ? this.opts_maxChunk() : 1;
    if (inserts.length > maxChunk) {
      this.rateBlocked++;
      return this.result({ blocked: 'chunk', rejected: inserts.length });
    }

    const res = this.result();
    if (deletions > 0) {
      this.typed = prev.slice(0, p);
      this.backspaces += deletions;
      res.backspaces = deletions;
    }
    for (const ch of inserts) {
      if (this.typed.length >= this.target.length) { res.rejected++; res.blocked = 'overflow'; continue; }
      const fe = this.firstErrorIndex();
      if (fe !== -1 && this.typed.length - fe >= this.opts.maxOverrun) { res.rejected++; res.blocked = 'overrun'; continue; }
      if (!flags.committed && now - this.lastInsertT < this.opts.minKeyInterval) {
        res.rejected++; res.blocked = 'rate'; this.rateBlocked++; continue;
      }
      const ok = ch === this.target[this.typed.length];
      this.typed.push(ch);
      this.totalKeystrokes++;
      if (ok) this.correctKeystrokes++; else this.errors++;
      this.lastInsertT = now;
      res.accepted++;
      res.keystrokes.push(ok);
    }
    res.value = this.typedString;
    res.passageCompleted = this.target.length > 0 && this.prefixCorrect === this.target.length;
    return res;
  }

  private opts_maxChunk() { return TYPING.maxChunk; }
}
