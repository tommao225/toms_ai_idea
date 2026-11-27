import { stepWorld, type WorldState } from '../world/world';

/** 模拟的唯一入口。v1 同步执行，以后搬进 Web Worker 只换实现。 */
export interface SimClock {
  step(world: WorldState): void;
}

export class LocalSimClock implements SimClock {
  step(world: WorldState): void {
    stepWorld(world);
  }
}

/** 固定步长累加器：把真实时间换算成这一帧该跑几个 tick。 */
export class TickTimer {
  tickMs: number;
  private accumulator = 0;
  private readonly maxCatchUpTicks = 5;

  constructor(tickMs: number) {
    this.tickMs = tickMs;
  }

  ticksDue(deltaMs: number): number {
    this.accumulator += Math.max(0, deltaMs);
    let ticks = 0;
    while (this.accumulator >= this.tickMs && ticks < this.maxCatchUpTicks) {
      this.accumulator -= this.tickMs;
      ticks += 1;
    }
    if (ticks === this.maxCatchUpTicks) this.accumulator = 0;
    return ticks;
  }

  reset(): void {
    this.accumulator = 0;
  }
}
