import { TYPING } from './config';

/** Accuracy = correct keystrokes / total keystrokes * 100 (100 when nothing typed). */
export function accuracyPercent(correct: number, total: number): number {
  return total <= 0 ? 100 : (correct / total) * 100;
}

/**
 * Accuracy over the most recent keystrokes, with a few "virtual correct" keystrokes
 * as a prior so one early typo does not swing the speed multiplier.
 */
export class RollingAccuracy {
  private buf: boolean[] = [];
  constructor(private window = TYPING.accuracyWindow, private prior = TYPING.accuracyPrior) {}
  push(correct: boolean) {
    this.buf.push(correct);
    if (this.buf.length > this.window) this.buf.shift();
  }
  value(): number {
    const ok = this.buf.reduce((n, b) => n + (b ? 1 : 0), 0);
    return (ok + this.prior) / (this.buf.length + this.prior);
  }
  reset() { this.buf = []; }
}
