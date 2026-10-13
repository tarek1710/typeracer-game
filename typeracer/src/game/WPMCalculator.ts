import { TYPING } from './config';

export const CHARS_PER_WORD = 5;

/** WPM = (correct chars / 5) / minutes */
export function wpmFromChars(correctChars: number, seconds: number): number {
  if (seconds <= 0 || correctChars <= 0) return 0;
  return correctChars / CHARS_PER_WORD / (seconds / 60);
}

/**
 * Records the cumulative count of correct characters over race time and answers
 * "how many net characters were added in the last N seconds?". Backspacing a
 * correct character lowers the count; idle time contributes nothing, so speed
 * decays naturally when the player stops typing.
 */
export class RecentWpmTracker {
  private samples: { t: number; c: number }[] = [{ t: 0, c: 0 }];

  reset() { this.samples = [{ t: 0, c: 0 }]; }

  record(t: number, count: number) {
    const last = this.samples[this.samples.length - 1];
    if (last.t === t) last.c = count;
    else this.samples.push({ t, c: count });
    while (this.samples.length > 2 && this.samples[1].t < t - 30) this.samples.shift();
  }

  private valueAt(t: number): number {
    let lo = 0, hi = this.samples.length - 1, ans = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (this.samples[mid].t <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return this.samples[ans].c;
  }

  recentWpm(now: number, windowSec = TYPING.windowSec, minSpan = TYPING.minSpan): number {
    const span = Math.min(windowSec, Math.max(now, minSpan));
    const delta = Math.max(0, this.valueAt(now) - this.valueAt(now - span));
    return wpmFromChars(delta, span);
  }
}
