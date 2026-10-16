import { OVERTAKE } from './config';
import type { CarState } from './types';

export interface OvertakeEvent { time: number; passerId: string; passedId: string }

/**
 * Keeps a stable ranking derived only from distance / finish order. A car must be more
 * than `hysteresis` metres ahead before it is ranked above another, so cars running
 * side by side do not flicker between positions. It never moves a car.
 */
export class OvertakingManager {
  order: string[];
  constructor(initial: CarState[], private hysteresis = OVERTAKE.hysteresis, private minDistance = OVERTAKE.minDistance) {
    this.order = initial.slice().sort((a, b) => a.lane - b.lane).map((c) => c.id);
  }

  rankOf(id: string) { return this.order.indexOf(id) + 1; }

  update(cars: CarState[], time: number): OvertakeEvent[] {
    const byId = new Map(cars.map((c) => [c.id, c]));
    const ahead = (a: CarState, b: CarState) => {
      if (a.finished && b.finished) return (a.finishTime ?? 0) < (b.finishTime ?? 0);
      if (a.finished) return true;
      if (b.finished) return false;
      return a.distance > b.distance + this.hysteresis;
    };
    const events: OvertakeEvent[] = [];
    for (let i = 1; i < this.order.length; i++) {
      let j = i;
      while (j > 0) {
        const a = byId.get(this.order[j])!;
        const b = byId.get(this.order[j - 1])!;
        if (!ahead(a, b)) break;
        this.order[j] = b.id; this.order[j - 1] = a.id;
        if (!a.finished && !b.finished && a.distance > this.minDistance) {
          events.push({ time, passerId: a.id, passedId: b.id });
        }
        j--;
      }
    }
    return events;
  }
}
