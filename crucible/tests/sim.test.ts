import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/app/commands';
import { AIR_ID, MATERIALS } from '../src/world/materials';
import { createWorld, materialAt, stepWorld, type WorldState } from '../src/world/world';

function id(key: string): number {
  const def = MATERIALS.find((item) => item.key === key);
  if (!def) throw new Error(`缺少物质：${key}`);
  return def.id;
}

const SAND = id('sand');
const STONE = id('stone');
const WATER = id('water');

function run(world: WorldState, ticks: number): void {
  for (let i = 0; i < ticks; i += 1) stepWorld(world);
}

function countMaterial(world: WorldState, material: number): number {
  let total = 0;
  for (let i = 0; i < world.cells.length; i += 1) if (world.cells[i] === material) total += 1;
  return total;
}

/** 5×5 的封闭盒子：四周是石头，内部是空气。 */
function boxedWorld(seed = 7): WorldState {
  const world = createWorld(5, 5, seed);
  for (let x = 0; x < 5; x += 1) {
    world.cells[0 * 5 + x] = STONE;
    world.cells[4 * 5 + x] = STONE;
  }
  for (let y = 0; y < 5; y += 1) {
    world.cells[y * 5 + 0] = STONE;
    world.cells[y * 5 + 4] = STONE;
  }
  return world;
}

describe('物质数据', () => {
  it('编号从 0 连续，空气为 0', () => {
    MATERIALS.forEach((def, index) => expect(def.id).toBe(index));
    expect(AIR_ID).toBe(0);
  });

  it('可放置的物质至少有三种', () => {
    expect(MATERIALS.filter((def) => def.placeable).length).toBeGreaterThanOrEqual(3);
  });
});

describe('粉末', () => {
  it('没有支撑时下落一格', () => {
    const world = createWorld(5, 5, 1);
    world.cells[1 * 5 + 2] = SAND;
    stepWorld(world);
    expect(materialAt(world, 2, 1)).toBe(AIR_ID);
    expect(materialAt(world, 2, 2)).toBe(SAND);
  });

  it('落到石头上就停下', () => {
    const world = createWorld(5, 5, 1);
    for (let x = 0; x < 5; x += 1) world.cells[4 * 5 + x] = STONE;
    world.cells[1 * 5 + 2] = SAND;
    run(world, 10);
    expect(materialAt(world, 2, 3)).toBe(SAND);
  });

  it('两粒沙都会落到盒底', () => {
    const world = boxedWorld();
    world.cells[1 * 5 + 2] = SAND;
    world.cells[1 * 5 + 3] = SAND;
    run(world, 20);
    const bottom = [materialAt(world, 1, 3), materialAt(world, 2, 3), materialAt(world, 3, 3)];
    expect(bottom.filter((cell) => cell === SAND).length).toBe(2);
  });

  it('会沉进水里', () => {
    const world = createWorld(5, 5, 1);
    for (let x = 0; x < 5; x += 1) world.cells[4 * 5 + x] = STONE;
    world.cells[3 * 5 + 1] = STONE;
    world.cells[3 * 5 + 3] = STONE;
    world.cells[3 * 5 + 2] = WATER;
    world.cells[2 * 5 + 2] = SAND;

    stepWorld(world);

    expect(materialAt(world, 2, 3)).toBe(SAND);
    expect(materialAt(world, 2, 2)).toBe(WATER);
  });
});

describe('液体', () => {
  it('会下落', () => {
    const world = createWorld(5, 5, 1);
    world.cells[1 * 5 + 2] = WATER;
    stepWorld(world);
    expect(materialAt(world, 2, 2)).toBe(WATER);
  });

  it('落到地面后总量不变', () => {
    const world = createWorld(9, 9, 5);
    for (let x = 0; x < 9; x += 1) world.cells[8 * 9 + x] = STONE;
    for (let y = 1; y <= 6; y += 1) world.cells[y * 9 + 4] = WATER;

    run(world, 200);

    expect(countMaterial(world, WATER)).toBe(6);
    let lowest = -1;
    for (let y = 0; y < 9; y += 1) {
      for (let x = 0; x < 9; x += 1) if (world.cells[y * 9 + x] === WATER) lowest = Math.max(lowest, y);
    }
    expect(lowest).toBe(7);
  });

  it('不会穿过石头', () => {
    const world = createWorld(5, 5, 1);
    world.cells[3 * 5 + 2] = STONE;
    world.cells[2 * 5 + 2] = WATER;
    run(world, 5);
    expect(materialAt(world, 2, 3)).toBe(STONE);
  });
});

describe('石头', () => {
  it('不会动', () => {
    const world = createWorld(5, 5, 1);
    world.cells[1 * 5 + 2] = STONE;
    run(world, 5);
    expect(materialAt(world, 2, 1)).toBe(STONE);
  });
});

describe('命令', () => {
  it('fill 铺满矩形并裁掉越界部分', () => {
    const world = createWorld(4, 4, 1);
    applyCommand(world, { type: 'fill', x: 1, y: 1, width: 10, height: 2, material: STONE });
    expect(materialAt(world, 1, 1)).toBe(STONE);
    expect(materialAt(world, 3, 2)).toBe(STONE);
    expect(materialAt(world, 0, 1)).toBe(AIR_ID);
    expect(materialAt(world, 1, 3)).toBe(AIR_ID);
  });

  it('place 画一个圆盘', () => {
    const world = createWorld(9, 9, 1);
    applyCommand(world, { type: 'place', x: 4, y: 4, brush: 2, material: SAND });
    expect(materialAt(world, 4, 4)).toBe(SAND);
    expect(materialAt(world, 4, 2)).toBe(SAND);
    expect(materialAt(world, 4, 1)).toBe(AIR_ID);
  });

  it('clear 把世界清空', () => {
    const world = createWorld(4, 4, 1);
    applyCommand(world, { type: 'fill', x: 0, y: 0, width: 4, height: 4, material: STONE });
    applyCommand(world, { type: 'clear' });
    expect(materialAt(world, 2, 2)).toBe(AIR_ID);
  });
});
