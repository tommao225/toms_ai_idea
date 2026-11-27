import { EventBus } from '../events';
import { AIR_ID, MATERIALS } from '../world/materials';
import { asView, createWorld, type WorldState, type WorldView } from '../world/world';
import { restoreSnapshot, snapshotBytes, takeSnapshot, type Snapshot } from '../world/snapshot';
import { applyCommand, type Command } from './commands';
import { LocalSimClock, TickTimer, type SimClock } from './clock';
import { stepDevices } from '../devices/step';

const MAX_UNDO = 30;
const TICK_MS = 50;
const SLOW_TICK_MS = 200;

export interface GameOptions {
  readonly width: number;
  readonly height: number;
  readonly seed: number;
}

export interface GameStats {
  readonly tick: number;
  readonly ticksPerSecond: number;
  readonly undoDepth: number;
  readonly snapshotBytes: number;
  readonly cells: number;
  readonly counts: readonly number[];
}

export interface DispatchOptions {
  /** 拖动笔刷时只在起笔那一刻存快照，避免撤销栈被刷爆。 */
  readonly snapshot?: boolean;
}

export class Game {
  readonly world: WorldState;
  readonly view: WorldView;
  readonly bus = new EventBus();
  readonly clock: SimClock = new LocalSimClock();
  paused = false;
  slow = false;

  private readonly seed: number;
  private undoStack: Snapshot[] = [];
  private readonly timer = new TickTimer(TICK_MS);

  constructor(options: GameOptions) {
    this.world = createWorld(options.width, options.height, options.seed);
    this.view = asView(this.world);
    this.seed = options.seed;
  }

  run(deltaMs: number): number {
    if (this.paused) return 0;
    const ticks = this.timer.ticksDue(deltaMs);
    for (let i = 0; i < ticks; i += 1) this.advanceOneTick();
    if (ticks > 0) this.bus.emit({ type: 'tick', tick: this.world.tick });
    return ticks;
  }

  stepOnce(): void {
    this.advanceOneTick();
    this.bus.emit({ type: 'tick', tick: this.world.tick });
  }

  /** 一个 tick 的顺序：先让装置动手，再让世界往前走。 */
  private advanceOneTick(): void {
    stepDevices(this.world);
    this.clock.step(this.world);
  }

  dispatch(command: Command, options: DispatchOptions = {}): void {
    if (options.snapshot !== false) this.pushSnapshot();
    applyCommand(this.world, command);
    this.bus.emit({ type: 'command', name: command.type, tick: this.world.tick });
  }

  undo(): boolean {
    const snapshot = this.undoStack.pop();
    if (!snapshot) return false;
    restoreSnapshot(this.world, snapshot);
    this.bus.emit({ type: 'undo', tick: this.world.tick });
    return true;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.timer.reset();
  }

  setSlow(slow: boolean): void {
    this.slow = slow;
    this.timer.tickMs = slow ? SLOW_TICK_MS : TICK_MS;
    this.timer.reset();
  }

  reset(): void {
    this.world.cells.fill(AIR_ID);
    this.world.temperature.fill(MATERIALS[AIR_ID].temperature);
    this.world.fallSpeed.fill(0);
    this.world.burnTime.fill(0);
    this.world.deviceCells.fill(0);
    this.world.deviceKind.fill(0);
    this.world.devices.length = 0;
    this.world.moved.fill(0);
    this.world.tick = 0;
    this.world.rng.state = this.seed;
    this.undoStack = [];
    this.timer.reset();
  }

  stats(): GameStats {
    const counts: number[] = new Array(MATERIALS.length).fill(0);
    const { cells } = this.world;
    for (let i = 0; i < cells.length; i += 1) counts[cells[i]] += 1;
    const top = this.undoStack[this.undoStack.length - 1];
    return {
      tick: this.world.tick,
      ticksPerSecond: Math.round(1000 / this.timer.tickMs),
      undoDepth: this.undoStack.length,
      snapshotBytes: top ? snapshotBytes(top) : 0,
      cells: cells.length,
      counts,
    };
  }

  private pushSnapshot(): void {
    this.undoStack.push(takeSnapshot(this.world));
    if (this.undoStack.length > MAX_UNDO) this.undoStack.shift();
  }
}
