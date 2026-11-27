import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/app/commands';
import { deviceIdOf } from '../src/devices/definitions';
import { stepDevices } from '../src/devices/step';
import { AIR_ID, materialIdOf } from '../src/world/materials';
import { createWorld, materialAt, stepWorld, type WorldState } from '../src/world/world';

const STONE = materialIdOf('stone');
const SAND = materialIdOf('sand');
const WATER = materialIdOf('water');
const GLASS = materialIdOf('glass');

const EMITTER = deviceIdOf('emitter');
const HEATER = deviceIdOf('heater');
const PIPE = deviceIdOf('pipe');
const PUMP = deviceIdOf('pump');

/** 三格宽、两侧是石墙的世界，用来测单列里的通行。 */
function walledWorld(height: number): WorldState {
  const world = createWorld(3, height, 1);
  for (let y = 0; y < height; y += 1) {
    world.cells[y * 3 + 0] = STONE;
    world.cells[y * 3 + 2] = STONE;
  }
  return world;
}

describe('喷口', () => {
  it('每个间隔往正下方吐一格', () => {
    const world = createWorld(5, 5, 1);
    applyCommand(world, { type: 'place-device', device: EMITTER, x: 2, y: 1 });
    stepDevices(world);
    expect(materialAt(world, 2, 2)).toBe(SAND);
  });

  it('下方有东西时不覆盖', () => {
    const world = createWorld(5, 5, 1);
    applyCommand(world, { type: 'place-device', device: EMITTER, x: 2, y: 1 });
    world.cells[2 * 5 + 2] = STONE;
    stepDevices(world);
    expect(materialAt(world, 2, 2)).toBe(STONE);
  });
});

describe('加热器', () => {
  it('把半径内的温度抬到设定值', () => {
    const world = createWorld(9, 9, 1);
    applyCommand(world, { type: 'place-device', device: HEATER, x: 4, y: 4 });
    stepDevices(world);
    expect(world.temperature[4 * 9 + 4]).toBe(900);
    expect(world.temperature[4 * 9 + 8]).toBe(900);
  });

  it('半径外不受影响', () => {
    const world = createWorld(21, 21, 1);
    applyCommand(world, { type: 'place-device', device: HEATER, x: 10, y: 10 });
    stepDevices(world);
    expect(world.temperature[0]).toBe(20);
  });
});

describe('管道', () => {
  it('挡住沙子', () => {
    const world = walledWorld(5);
    applyCommand(world, { type: 'place-device', device: PIPE, x: 1, y: 2 });
    world.cells[1 * 3 + 1] = SAND;
    for (let i = 0; i < 10; i += 1) stepWorld(world);
    expect(materialAt(world, 1, 1)).toBe(SAND);
  });

  it('让水通过', () => {
    const world = walledWorld(5);
    applyCommand(world, { type: 'place-device', device: PIPE, x: 1, y: 2 });
    world.cells[1 * 3 + 1] = WATER;
    for (let i = 0; i < 10; i += 1) stepWorld(world);
    expect(materialAt(world, 1, 4)).toBe(WATER);
  });
});

describe('泵', () => {
  it('把背后的液体推到前面', () => {
    const world = createWorld(5, 3, 1);
    applyCommand(world, { type: 'place-device', device: PUMP, x: 2, y: 1 });
    world.cells[1 * 5 + 1] = WATER;
    stepDevices(world);
    expect(materialAt(world, 1, 1)).toBe(AIR_ID);
    expect(materialAt(world, 3, 1)).toBe(WATER);
  });
});

describe('装置阻挡', () => {
  it('沙子落在装置上会停住', () => {
    const world = walledWorld(5);
    applyCommand(world, { type: 'place-device', device: HEATER, x: 1, y: 3 });
    world.cells[1 * 3 + 1] = SAND;
    for (let i = 0; i < 10; i += 1) stepWorld(world);
    expect(materialAt(world, 1, 2)).toBe(SAND);
  });
});

describe('W2 验收：沙经加热器变成玻璃', () => {
  it('喷口出沙，落下途中被加热，最后变成玻璃', () => {
    const world = createWorld(9, 20, 3);
    applyCommand(world, { type: 'place-device', device: EMITTER, x: 4, y: 0 });
    applyCommand(world, { type: 'place-device', device: HEATER, x: 6, y: 12 });

    for (let i = 0; i < 300; i += 1) {
      stepDevices(world);
      stepWorld(world);
    }

    let glass = 0;
    for (let i = 0; i < world.cells.length; i += 1) if (world.cells[i] === GLASS) glass += 1;
    expect(glass).toBeGreaterThan(0);
  });
});
