import { describe, expect, it } from 'vitest';
import { DEVICES } from '../src/devices/definitions';
import { materialIdOf } from '../src/world/materials';
import { createWorld, stepWorld, type WorldState } from '../src/world/world';

const STONE = materialIdOf('stone');
const SAND = materialIdOf('sand');
const OIL = materialIdOf('oil');
const WATER = materialIdOf('water');
const LAVA = materialIdOf('lava');
const FIRE = materialIdOf('fire');

function countMaterial(world: WorldState, material: number): number {
  let total = 0;
  for (let i = 0; i < world.cells.length; i += 1) if (world.cells[i] === material) total += 1;
  return total;
}

describe('火不会隔墙烧过来', () => {
  it('中间隔一格石头就点不着', () => {
    const world = createWorld(9, 5, 1);
    for (let x = 0; x < 9; x += 1) world.cells[4 * 9 + x] = STONE;
    world.cells[3 * 9 + 2] = FIRE;
    world.cells[3 * 9 + 3] = STONE;
    world.cells[3 * 9 + 4] = OIL;

    stepWorld(world);

    expect(countMaterial(world, OIL)).toBe(1);
  });
});

describe('火是扩散，不是一 tick 烧穿', () => {
  it('一 tick 只点着附近的油，不会整条烧起来', () => {
    const world = createWorld(41, 4, 1);
    for (let x = 0; x < 41; x += 1) world.cells[3 * 41 + x] = STONE;
    for (let x = 1; x < 40; x += 1) world.cells[2 * 41 + x] = OIL;
    world.cells[2 * 41 + 20] = FIRE;

    stepWorld(world);

    expect(countMaterial(world, FIRE)).toBeLessThan(10);
  });

  it('左右大致对称', () => {
    const world = createWorld(41, 4, 1);
    for (let x = 0; x < 41; x += 1) world.cells[3 * 41 + x] = STONE;
    for (let x = 1; x < 40; x += 1) world.cells[2 * 41 + x] = OIL;
    world.cells[2 * 41 + 20] = FIRE;

    stepWorld(world);

    let left = 0;
    let right = 0;
    for (let x = 0; x < 41; x += 1) {
      if (world.cells[2 * 41 + x] !== FIRE) continue;
      if (x < 20) left += 1;
      else if (x > 20) right += 1;
    }
    expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
  });
});

describe('一格一 tick 只反应一次', () => {
  it('先被火点着的油，不会同一 tick 再被水浇成空气', () => {
    const world = createWorld(3, 2, 1);
    world.cells[0] = OIL; // (0,0)
    world.cells[1] = FIRE; // (1,0)
    world.cells[3] = WATER; // (0,1)

    stepWorld(world);

    expect(world.cells[0]).toBe(FIRE);
  });
});

describe('热量能散到环境里', () => {
  it('烧热的石头会自己凉下来', () => {
    const world = createWorld(9, 9, 1);
    for (let i = 0; i < world.cells.length; i += 1) world.cells[i] = STONE;
    world.temperature.fill(1100);

    for (let i = 0; i < 600; i += 1) stepWorld(world);

    let hottest = 0;
    for (let i = 0; i < world.temperature.length; i += 1) {
      if (world.temperature[i] > hottest) hottest = world.temperature[i];
    }
    expect(hottest).toBeLessThan(100);
  });

  it('差 1 度也会回到环境温度', () => {
    const world = createWorld(5, 5, 1);
    world.temperature.fill(20);
    world.temperature[12] = 21;

    stepWorld(world);

    expect(world.temperature[12]).toBe(20);
  });

  it('岩浆是恒温热源，不会自己凉', () => {
    const world = createWorld(9, 9, 1);
    for (let i = 0; i < world.cells.length; i += 1) world.cells[i] = LAVA;

    for (let i = 0; i < 600; i += 1) stepWorld(world);

    let hottest = 0;
    for (let i = 0; i < world.temperature.length; i += 1) {
      if (world.temperature[i] > hottest) hottest = world.temperature[i];
    }
    expect(hottest).toBeGreaterThan(900);
  });
});

describe('浇岩浆', () => {
  it('一层岩浆能被水整层浇成石头，然后凉下来', () => {
    const width = 21;
    const height = 14;
    const world = createWorld(width, height, 1);
    for (let x = 0; x < width; x += 1) world.cells[(height - 1) * width + x] = STONE;
    for (let x = 1; x < width - 1; x += 1) world.cells[(height - 2) * width + x] = LAVA;
    for (let y = 8; y <= height - 3; y += 1) {
      for (let x = 1; x < width - 1; x += 1) world.cells[y * width + x] = WATER;
    }

    for (let i = 0; i < 600; i += 1) stepWorld(world);

    expect(countMaterial(world, LAVA)).toBe(0);
    let hottest = 0;
    for (let i = 0; i < world.temperature.length; i += 1) {
      if (world.temperature[i] > hottest) hottest = world.temperature[i];
    }
    expect(hottest).toBeLessThan(100);
  });
});


describe('委托不能靠干等通关', () => {
  it('油线上的火会一路烧过去，不会自己停在半路', () => {
    const width = 120;
    const world = createWorld(width, 5, 3);
    for (let x = 0; x < width; x += 1) world.cells[4 * width + x] = STONE;
    for (let x = 1; x < width - 1; x += 1) world.cells[3 * width + x] = OIL;
    world.cells[3 * width + 1] = FIRE;

    for (let i = 0; i < 200; i += 1) stepWorld(world);

    // 烧到尽头：最右边那格油也没了
    expect(world.cells[3 * width + (width - 2)]).not.toBe(OIL);
  });
});

describe('装置数据', () => {  it('传感器阈值读的是 100，不是默认的 900', () => {
    const sensor = DEVICES.find((def) => def.key === 'sensor');
    expect(sensor).toBeTruthy();
    expect(sensor?.temperature).toBe(100);
  });

  it('喷口默认喷沙', () => {
    const emitter = DEVICES.find((def) => def.key === 'emitter');
    expect(emitter?.material).toBe(SAND);
  });
});
