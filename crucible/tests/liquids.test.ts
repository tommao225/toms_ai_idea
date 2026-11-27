import { describe, expect, it } from 'vitest';
import { materialIdOf } from '../src/world/materials';
import { createWorld, stepWorld, type WorldState } from '../src/world/world';

const STONE = materialIdOf('stone');
const WATER = materialIdOf('water');
const OIL = materialIdOf('oil');

/** 封闭的杯子：左右是墙，底下是地板。 */
function cup(width: number, height: number): WorldState {
  const world = createWorld(width, height, 1);
  for (let x = 0; x < width; x += 1) world.cells[(height - 1) * width + x] = STONE;
  for (let y = 0; y < height; y += 1) {
    world.cells[y * width] = STONE;
    world.cells[y * width + width - 1] = STONE;
  }
  return world;
}

/** 某一列最上面那格液体的 y，没有液体返回 -1。 */
function surfaceOf(world: WorldState, x: number): number {
  for (let y = 0; y < world.height; y += 1) {
    const id = world.cells[y * world.width + x];
    if (id === WATER || id === OIL) return y;
  }
  return -1;
}

/** 某一列里指定物质的 y，没有返回 -1。 */
function findY(world: WorldState, x: number, material: number): number {
  for (let y = 0; y < world.height; y += 1) {
    if (world.cells[y * world.width + x] === material) return y;
  }
  return -1;
}

describe('油比水轻', () => {
  it('水在油上面会沉下去，油浮上来', () => {
    const world = cup(3, 9);
    world.cells[5 * 3 + 1] = WATER;
    world.cells[6 * 3 + 1] = OIL;

    for (let i = 0; i < 5; i += 1) stepWorld(world);

    expect(findY(world, 1, OIL)).toBeLessThan(findY(world, 1, WATER));
  });

  it('油已经在上面就稳定不动', () => {
    const world = cup(3, 9);
    world.cells[5 * 3 + 1] = OIL;
    world.cells[6 * 3 + 1] = WATER;

    for (let i = 0; i < 5; i += 1) stepWorld(world);

    expect(findY(world, 1, OIL)).toBeLessThan(findY(world, 1, WATER));
  });
});

describe('水不会瞬间穿进油里', () => {
  it('空中的水团一格一格往下掉，不会直接出现在池底', () => {
    const world = cup(21, 30);
    for (let y = 26; y <= 28; y += 1) for (let x = 1; x <= 19; x += 1) world.cells[y * 21 + x] = OIL;
    for (let y = 2; y <= 4; y += 1) for (let x = 9; x <= 11; x += 1) world.cells[y * 21 + x] = WATER;

    stepWorld(world);

    let waterInOil = 0;
    for (let y = 26; y <= 28; y += 1) {
      for (let x = 1; x <= 19; x += 1) if (world.cells[y * 21 + x] === WATER) waterInOil += 1;
    }
    expect(waterInOil).toBe(0);
  });
});

describe('大池子的分层', () => {
  it('并排的水和油会分层：水在下面、油在上面，各自液面水平', () => {
    const world = cup(21, 16);
    for (let y = 10; y <= 13; y += 1) {
      for (let x = 1; x <= 10; x += 1) world.cells[y * 21 + x] = WATER;
      for (let x = 11; x <= 19; x += 1) world.cells[y * 21 + x] = OIL;
    }

    for (let i = 0; i < 300; i += 1) stepWorld(world);

    let columns = 0;
    let oilOnTop = 0;
    let waterAtBottom = 0;
    for (let x = 1; x <= 19; x += 1) {
      const top = surfaceOf(world, x);
      if (top < 0) continue;
      columns += 1;
      if (world.cells[top * 21 + x] === OIL) oilOnTop += 1;
      // 往下找最后一格液体
      let bottom = -1;
      for (let y = top; y < 15; y += 1) {
        const id = world.cells[y * 21 + x];
        if (id === WATER || id === OIL) bottom = y;
      }
      if (bottom >= 0 && world.cells[bottom * 21 + x] === WATER) waterAtBottom += 1;
    }

    expect(columns).toBeGreaterThan(10);
    expect(oilOnTop / columns).toBeGreaterThan(0.9);
    expect(waterAtBottom / columns).toBeGreaterThan(0.9);
  });

  it('水整层压在油上，也会整体沉到油下面', () => {
    const world = cup(41, 20);
    // 上层是水，下层是油，故意摆反
    for (let y = 2; y <= 7; y += 1) for (let x = 8; x <= 32; x += 1) world.cells[y * 41 + x] = WATER;
    for (let y = 8; y <= 13; y += 1) for (let x = 5; x <= 35; x += 1) world.cells[y * 41 + x] = OIL;

    for (let i = 0; i < 200; i += 1) stepWorld(world);

    let columns = 0;
    let oilOnTop = 0;
    for (let x = 1; x <= 39; x += 1) {
      const top = surfaceOf(world, x);
      if (top < 0) continue;
      columns += 1;
      if (world.cells[top * 41 + x] === OIL) oilOnTop += 1;
    }
    expect(columns).toBeGreaterThan(10);
    expect(oilOnTop / columns).toBeGreaterThan(0.9);
  });
});

describe('液面找平', () => {
  it('杯子里高低不平的水 1 秒内拉平', () => {
    const world = cup(61, 40);
    for (let y = 22; y < 39; y += 1) for (let x = 16; x < 34; x += 1) world.cells[y * 61 + x] = WATER;
    for (let y = 27; y < 39; y += 1) for (let x = 34; x < 44; x += 1) world.cells[y * 61 + x] = WATER;

    for (let i = 0; i < 20; i += 1) stepWorld(world);

    let min = 999;
    let max = -1;
    for (let x = 16; x < 44; x += 1) {
      const top = surfaceOf(world, x);
      if (top < 0) continue;
      if (top < min) min = top;
      if (top > max) max = top;
    }
    expect(max - min).toBeLessThanOrEqual(1);
  });
  it('一大摊水几十 tick 内就摊平到整个容器', () => {
    const world = cup(61, 16);
    for (let y = 6; y <= 13; y += 1) for (let x = 1; x <= 20; x += 1) world.cells[y * 61 + x] = WATER;

    for (let i = 0; i < 30; i += 1) stepWorld(world);

    let columns = 0;
    for (let x = 1; x <= 59; x += 1) if (surfaceOf(world, x) >= 0) columns += 1;
    expect(columns).toBeGreaterThanOrEqual(35);
  });

  it('相邻两列的液面差不超过一格', () => {
    const world = cup(41, 16);
    for (let y = 4; y <= 13; y += 1) for (let x = 1; x <= 8; x += 1) world.cells[y * 41 + x] = WATER;

    for (let i = 0; i < 120; i += 1) stepWorld(world);

    let worst = 0;
    for (let x = 1; x < 39; x += 1) {
      const a = surfaceOf(world, x);
      const b = surfaceOf(world, x + 1);
      if (a < 0 || b < 0) continue;
      worst = Math.max(worst, Math.abs(a - b));
    }
    expect(worst).toBeLessThanOrEqual(1);
  });
});

describe('溅射', () => {
  it('水砸到石头上会溅起来', () => {
    const world = cup(21, 20);
    world.cells[2 * 21 + 10] = WATER;

    let sawSplash = false;
    for (let i = 0; i < 30; i += 1) {
      stepWorld(world);
      if (world.splashes.some((s) => s.kind === 0)) sawSplash = true;
    }
    expect(sawSplash).toBe(true);
  });

  it('落进水里是另一种溅射，不会当成砸石头', () => {
    const world = cup(21, 20);
    for (let x = 1; x < 20; x += 1) world.cells[18 * 21 + x] = WATER;
    world.cells[2 * 21 + 10] = WATER;

    let sawLiquidSplash = false;
    for (let i = 0; i < 30; i += 1) {
      stepWorld(world);
      if (world.splashes.some((s) => s.kind === 1)) sawLiquidSplash = true;
    }
    expect(sawLiquidSplash).toBe(true);
  });
});

describe('液面找平（旧用例）', () => {
  it('高低不平的水面会被拉平', () => {
    const world = cup(21, 12);
    // 左边五格深，右边两格深
    for (let y = 6; y <= 10; y += 1) for (let x = 1; x <= 9; x += 1) world.cells[y * 21 + x] = WATER;
    for (let y = 9; y <= 10; y += 1) for (let x = 10; x <= 19; x += 1) world.cells[y * 21 + x] = WATER;

    const before = Math.abs(surfaceOf(world, 1) - surfaceOf(world, 19));
    expect(before).toBeGreaterThanOrEqual(3);

    for (let i = 0; i < 120; i += 1) stepWorld(world);

    const after = Math.abs(surfaceOf(world, 1) - surfaceOf(world, 19));
    expect(after).toBeLessThanOrEqual(1);
  });

  it('找平是快的：几十 tick 内就摊开大半个容器', () => {
    const world = cup(41, 14);
    for (let y = 4; y <= 12; y += 1) for (let x = 1; x <= 8; x += 1) world.cells[y * 41 + x] = WATER;

    for (let i = 0; i < 40; i += 1) stepWorld(world);

    let columnsWithWater = 0;
    for (let x = 1; x <= 39; x += 1) if (surfaceOf(world, x) >= 0) columnsWithWater += 1;
    expect(columnsWithWater).toBeGreaterThanOrEqual(20);
  });
});
