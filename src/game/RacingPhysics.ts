import { PHYSICS } from './config';
import type { PhysicsParams } from './types';
import { clamp } from './rng';

/**
 * Accuracy multiplier in [0.6, 1] (normal) or [0.25, 1] (strict / Accuracy Challenge).
 * 100% accuracy -> 1.0; 75% or lower -> floor. Never zero, so mistakes are not crushing.
 */
export function accuracyMultiplier(accuracy01: number, strict = false): number {
  const a = clamp(accuracy01, 0, 1);
  return strict
    ? 0.25 + 0.75 * clamp((a - 0.85) / 0.15, 0, 1)
    : 0.6 + 0.4 * clamp((a - 0.75) / 0.25, 0, 1);
}

/**
 * EffectiveSpeed = Base + Bonus * AccuracyMultiplier
 * Bonus = (Ref - Base) * clamp(wpm / skill, 0, maxRatio)
 * The WPM is normalised by the calibrated skill, so a beginner at 15 WPM and a
 * pro at 90 WPM both reach `refSpeed` when typing at their own level.
 */
export function targetSpeed(
  wpm: number, skillWpm: number, accuracy01: number, strict = false, p: PhysicsParams = PHYSICS,
): number {
  const ratio = clamp(wpm / Math.max(skillWpm, 1), 0, p.maxRatio);
  const bonus = (p.refSpeed - p.baseSpeed) * ratio;
  return p.baseSpeed + bonus * accuracyMultiplier(accuracy01, strict);
}

export const maxSpeed = (p: PhysicsParams = PHYSICS) => p.baseSpeed + (p.refSpeed - p.baseSpeed) * p.maxRatio;

/** Rate-limited approach to the target speed (acceleration / deceleration limits). */
export function stepSpeed(v: number, target: number, dt: number, p: PhysicsParams = PHYSICS): number {
  const diff = target - v;
  const limit = diff > 0 ? p.accel : p.decel;
  const dv = clamp(diff * p.response, -limit, limit) * dt;
  return Math.abs(dv) >= Math.abs(diff) ? target : v + dv;
}

/** Distance = previous distance + speed * dt. Positions are only ever changed here. */
export const integrate = (distance: number, speed: number, dt: number) => distance + speed * dt;
