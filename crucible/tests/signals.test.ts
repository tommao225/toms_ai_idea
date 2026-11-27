import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/app/commands';
import { deviceIdOf } from '../src/devices/definitions';
import { stepDevices } from '../src/devices/step';
import { AIR_ID, materialIdOf } from '../src/world/materials';
import { createWorld, materialAt, stepWorld, type WorldState } from '../src/world/world';

const STONE = materialIdOf('stone');
const WATER = materialIdOf('water');

const SENSOR = deviceIdOf('sensor');
const VALVE = deviceIdOf('valve');

function walledWorld(height: number): WorldState {
  const world = createWorld(3, height, 1);
  for (let y = 0; y < height; y += 1) {
    world.cells[y * 3 + 0] = STONE;
    world.cells[y * 3 + 2] = STONE;
  }
  return world;
}

describe('信号', () => {
  it('传感器一亮，范围里的阀门就开；灭了自己关回去', () => {
    const world = createWorld(5, 5, 1);
    applyCommand(world, { type: 'place-device', device: SENSOR, x: 2, y: 0 });
    applyCommand(world, { type: 'place-device', device: VALVE, x: 2, y: 2 });

    world.cells[1 * 5 + 2] = WATER;
    stepDevices(world);
    expect(world.deviceKind[2 * 5 + 2]).toBe(2);

    world.cells[1 * 5 + 2] = AIR_ID;
    stepDevices(world);
    expect(world.deviceKind[2 * 5 + 2]).toBe(1);
  });

  it('没有传感器覆盖的装置默认通电', () => {
    const world = createWorld(5, 5, 1);
    applyCommand(world, { type: 'place-device', device: VALVE, x: 2, y: 2 });
    stepDevices(world);
    expect(world.deviceKind[2 * 5 + 2]).toBe(2);
  });
});

describe('阀门通行', () => {
  it('关着的时候水过不去', () => {
    const world = walledWorld(5);
    applyCommand(world, { type: 'place-device', device: VALVE, x: 1, y: 2 });
    world.deviceKind[2 * 3 + 1] = 1;
    world.cells[1 * 3 + 1] = WATER;
    for (let i = 0; i < 10; i += 1) stepWorld(world);
    expect(materialAt(world, 1, 1)).toBe(WATER);
  });

  it('开着的时候水能穿过去', () => {
    const world = walledWorld(5);
    applyCommand(world, { type: 'place-device', device: VALVE, x: 1, y: 2 });
    world.deviceKind[2 * 3 + 1] = 2;
    world.cells[1 * 3 + 1] = WATER;
    for (let i = 0; i < 10; i += 1) stepWorld(world);
    expect(materialAt(world, 1, 4)).toBe(WATER);
  });
});
