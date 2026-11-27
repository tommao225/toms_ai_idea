import { describe, expect, it } from 'vitest';
import { materialIdOf } from '../src/world/materials';
import { createWorld, materialAt, stepWorld, type WorldState } from '../src/world/world';

const SAND = materialIdOf('sand');
const WATER = materialIdOf('water');
const STONE = materialIdOf('stone');

function column(height: number): WorldState {
  const world = createWorld(3, height, 1);
  for (let y = 0; y < height; y += 1) {
    world.cells[y * 3 + 0] = STONE;
    world.cells[y * 3 + 2] = STONE;
  }
  return world;
}

describe('自由落体', () => {
  it('沙子越落越快：第 1 tick 一格，第 2 tick 两格，第 3 tick 三格', () => {
    const world = column(40);
    world.cells[3 + 1] = SAND; // (1, 1)

    stepWorld(world);
    expect(materialAt(world, 1, 2)).toBe(SAND);

    stepWorld(world);
    expect(materialAt(world, 1, 4)).toBe(SAND);

    stepWorld(world);
    expect(materialAt(world, 1, 7)).toBe(SAND);
  });

  it('水也会加速下落', () => {
    const world = column(40);
    world.cells[3 + 1] = WATER; // (1, 1)

    stepWorld(world);
    expect(materialAt(world, 1, 2)).toBe(WATER);

    stepWorld(world);
    expect(materialAt(world, 1, 4)).toBe(WATER);
  });

  it('落到地面后速度归零，不会攒着下一次爆发', () => {
    const world = column(8);
    world.cells[7 * 3 + 1] = STONE; // 地面在 (1, 7)
    world.cells[3 + 1] = SAND;

    for (let i = 0; i < 10; i += 1) stepWorld(world);
    expect(materialAt(world, 1, 6)).toBe(SAND);
    expect(world.fallSpeed[6 * 3 + 1]).toBe(0);
  });

  it('沉进水里只走一格，不穿过整片水', () => {
    const world = column(10);
    for (let y = 6; y < 9; y += 1) world.cells[y * 3 + 1] = WATER;
    world.cells[9 * 3 + 1] = STONE;
    world.cells[3 + 1] = SAND; // (1, 1)

    for (let i = 0; i < 6; i += 1) stepWorld(world);
    // 沙子落到底，水被顶上去，沙子只跟水换位，不越过它们
    expect(materialAt(world, 1, 8)).toBe(SAND);
  });
});

describe('落地后快速摊开', () => {
  it('一格水落在平地上就地停住，不会瞬移十几格', () => {
    const world = createWorld(41, 3, 7);
    for (let x = 0; x < 41; x += 1) world.cells[2 * 41 + x] = STONE;
    world.cells[1 * 41 + 20] = WATER;

    stepWorld(world);

    let found = -1;
    for (let x = 0; x < 41; x += 1) if (materialAt(world, x, 1) === WATER) found = x;
    expect(found).toBe(20);
  });

  it('沙粒落到石头上，会沿斜面一 tick 滑好几格', () => {
    const world = createWorld(21, 12, 3);
    for (let x = 0; x < 21; x += 1) world.cells[11 * 21 + x] = STONE;
    world.cells[3 * 21 + 10] = STONE;
    world.cells[2 * 21 + 10] = SAND;

    stepWorld(world);

    let found = -1;
    for (let y = 0; y < 12; y += 1) {
      for (let x = 0; x < 21; x += 1) if (materialAt(world, x, y) === SAND) found = x;
    }
    expect(Math.abs(found - 10)).toBeGreaterThanOrEqual(3);
  });
});
