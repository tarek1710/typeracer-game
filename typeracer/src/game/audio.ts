/** Restrained WebAudio feedback. The context is only created after a user gesture. */
class AudioManager {
  enabled = true;
  private ctx: AudioContext | null = null;
  private lastTick = 0;

  unlock() {
    if (!this.enabled) return;
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new Ctor();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch { this.ctx = null; }
  }

  private beep(freq: number, dur: number, gain = 0.06, type: OscillatorType = 'sine', delay = 0) {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  countdown() { this.beep(440, 0.15, 0.07); }
  go() { this.beep(880, 0.35, 0.08, 'square'); }
  tick() {
    const now = performance.now();
    if (now - this.lastTick < 110) return; // never on every keystroke
    this.lastTick = now;
    this.beep(1400, 0.02, 0.012, 'triangle');
  }
  overtake() { this.beep(520, 0.09, 0.05); this.beep(780, 0.12, 0.05, 'sine', 0.09); }
  finish() { this.beep(660, 0.2, 0.06, 'square'); }
  victory() { [523, 659, 784, 1047].forEach((f, i) => this.beep(f, 0.22, 0.06, 'triangle', i * 0.13)); }
  defeat() { [330, 277, 220].forEach((f, i) => this.beep(f, 0.26, 0.05, 'sawtooth', i * 0.16)); }
}

export const audio = new AudioManager();
