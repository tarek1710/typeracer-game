type Raf = (cb: (ts: number) => void) => number;
type Caf = (id: number) => void;

/** requestAnimationFrame wrapper: start() is idempotent and stop() always cancels the pending frame. */
export class GameLoop {
  private id: number | null = null;
  private last = -1;
  private running = false;

  constructor(
    private tick: (dt: number) => void,
    private raf: Raf = (cb) => requestAnimationFrame(cb),
    private caf: Caf = (id) => cancelAnimationFrame(id),
    private maxDt = 0.1,
  ) {}

  get isRunning() { return this.running; }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = -1;
    this.id = this.raf(this.frame);
  }

  stop() {
    this.running = false;
    if (this.id !== null) this.caf(this.id);
    this.id = null;
  }

  private frame = (ts: number) => {
    if (!this.running) return;
    const dt = this.last < 0 ? 0 : Math.min((ts - this.last) / 1000, this.maxDt);
    this.last = ts;
    this.tick(dt);
    if (this.running) this.id = this.raf(this.frame);
  };
}
