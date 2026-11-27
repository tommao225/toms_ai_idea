import type { DeviceInstance, WorldState } from './world';

export interface Snapshot {
  readonly width: number;
  readonly height: number;
  readonly cells: Uint8Array;
  readonly temperature: Int16Array;
  readonly fallSpeed: Uint8Array;
  readonly burnTime: Uint8Array;
  readonly deviceCells: Uint8Array;
  readonly deviceKind: Uint8Array;
  readonly devices: readonly DeviceInstance[];
  readonly tick: number;
  readonly rngState: number;
}

export function takeSnapshot(world: WorldState): Snapshot {
  return {
    width: world.width,
    height: world.height,
    cells: world.cells.slice(),
    temperature: world.temperature.slice(),
    fallSpeed: world.fallSpeed.slice(),
    burnTime: world.burnTime.slice(),
    deviceCells: world.deviceCells.slice(),
    deviceKind: world.deviceKind.slice(),
    devices: world.devices.map((device) => ({ ...device })),
    tick: world.tick,
    rngState: world.rng.state,
  };
}

export function restoreSnapshot(world: WorldState, snapshot: Snapshot): void {
  if (snapshot.width !== world.width || snapshot.height !== world.height) {
    throw new Error(`快照尺寸与当前世界不一致：${snapshot.width}×${snapshot.height}`);
  }
  world.cells.set(snapshot.cells);
  world.temperature.set(snapshot.temperature);
  world.fallSpeed.set(snapshot.fallSpeed);
  world.burnTime.set(snapshot.burnTime);
  world.deviceCells.set(snapshot.deviceCells);
  world.deviceKind.set(snapshot.deviceKind);
  world.devices.length = 0;
  for (const device of snapshot.devices) world.devices.push({ ...device });
  world.moved.fill(0);
  world.tick = snapshot.tick;
  world.rng.state = snapshot.rngState;
}

export function snapshotBytes(snapshot: Snapshot): number {
  return (
    snapshot.cells.byteLength +
    snapshot.temperature.byteLength +
    snapshot.fallSpeed.byteLength +
    snapshot.burnTime.byteLength +
    snapshot.deviceCells.byteLength +
    snapshot.deviceKind.byteLength
  );
}
