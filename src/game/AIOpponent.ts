import { PHYSICS } from './config';
import { integrate, stepSpeed, targetSpeed } from './RacingPhysics';
import type { OpponentProfile } from './AIDifficultyManager';
import type { CarState, PhysicsParams } from './types';
import { clamp, gaussian, rand, type Rng } from './rng';

/**
 * Drives one AI car. It produces a simulated WPM (target * personality noise) and then
 * uses exactly the same speed + distance functions as the player.
 */
export class AIOpponent {
  private ou = 0;
  private burst = 0;
  private burstTarget = 0;
  private nextBurstAt: number;
  private phys: PhysicsParams;

  constructor(
    readonly profile: OpponentProfile, readonly car: CarState,
    private rng: Rng, private skillWpm: number, private strict: boolean,
  ) {
    this.nextBurstAt = rand(rng, 3, 7);
    this.phys = {
      ...PHYSICS,
      accel: PHYSICS.accel * profile.accelMul,
      decel: PHYSICS.decel * profile.decelMul,
    };
  }

  update(time: number, dt: number, catchUpMult = 1) {
    const pr = this.profile;
    const k = dt / pr.tau;
    this.ou += -this.ou * k + pr.variation * Math.sqrt(2 * k) * gaussian(this.rng);
    this.ou = clamp(this.ou, -3 * pr.variation, 3 * pr.variation);

    if (pr.burstAmp > 0 && time >= this.nextBurstAt) {
      const roll = this.rng();
      this.burstTarget = roll < 0.4 ? -pr.burstAmp : roll < 0.8 ? pr.burstAmp : 0;
      this.nextBurstAt = time + rand(this.rng, 5, 11);
    }
    this.burst += (this.burstTarget - this.burst) * Math.min(1, dt / 1.2);

    const start = pr.startBoost * Math.exp(-time / 8);
    // Same warm-up a human has (reaction time + the recent-WPM window filling up), so AI cars
    // do not get a free head start over a player who has to begin typing.
    const warm = 1 - Math.exp(-(time + 0.3) / 1.3);
    const wpm = clamp(pr.targetWpm * (1 + this.ou + this.burst + start) * catchUpMult, pr.targetWpm * 0.35, pr.maxWpm) * warm;
    const acc = clamp(pr.accuracy + this.ou * 0.3, 0.8, 1);

    const c = this.car;
    c.currentWpm = wpm;
    c.targetSpeed = targetSpeed(wpm, this.skillWpm, acc, this.strict, this.phys);
    c.speed = stepSpeed(c.speed, c.targetSpeed, dt, this.phys);
    c.distance = integrate(c.distance, c.speed, dt);
  }
}
