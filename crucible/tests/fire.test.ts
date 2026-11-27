import { describe, expect, it } from 'vitest';
import { materialIdOf } from '../src/world/materials';
import { createWorld, FIRE_BURN_TICKS, materialAt, setMaterial, stepWorld, type WorldState } from '../src/world/world';

const STONE = materialIdOf('stone');
const OIL = materialIdOf('oil');
const FIRE = materialIdOf('fire');
const AIR_ID = 0;

describe('火是短暂的燃烧状态', () => {
  it('火会往上飘，一 tick 一格', () => {
    const world = createWorld(5, 5, 1);
    setMaterial(world, 3 * 5 + 2, FIRE);

    stepWorld(world);

    expect(materialAt(world, 2, 2)).toBe(FIRE);
    expect(materialAt(world, 2, 3)).toBe(AIR_ID);
  });

  it('烧够时间就消失，一层层烧没了', () => {
    const world = createWorld(5, 5, 1);
    setMaterial(world, 2 * 5 + 2, FIRE);

    for (let i = 0; i < FIRE_BURN_TICKS + 4; i += 1) stepWorld(world);

    let fire = 0;
    for (let i = 0; i < world.cells.length; i += 1) if (world.cells[i] === FIRE) fire += 1;
    expect(fire).toBe(0);
  });

  it('烧的时候仍然是热的', () => {
    const world = createWorld(5, 5, 1);
    setMaterial(world, 2 * 5 + 2, FIRE);

    stepWorld(world);

    expect(world.temperature[2 * 5 + 1]).toBeGreaterThan(20);
  });
});

describe('点着一片油', () => {
  /** 9×9 的盆：地板在 y=8，两侧墙在 x=2 和 x=6，中间三格油。 */
  function oilBasin(): WorldState {
    const world = createWorld(9, 9, 1);
    for (let x = 0; x < 9; x += 1) world.cells[8 * 9 + x] = STONE;
    world.cells[7 * 9 + 2] = STONE;
    world.cells[7 * 9 + 6] = STONE;
    for (let x = 3; x <= 5; x += 1) setMaterial(world, 7 * 9 + x, OIL);
    return world;
  }

  it('一格火会顺着油烧开整片', () => {
    const world = oilBasin();
    setMaterial(world, 7 * 9 + 4, FIRE);

    for (let i = 0; i < 10; i += 1) stepWorld(world);

    let oil = 0;
    let fire = 0;
    for (let i = 0; i < world.cells.length; i += 1) {
      if (world.cells[i] === OIL) oil += 1;
      if (world.cells[i] === FIRE) fire += 1;
    }
    expect(oil).toBe(0);
    expect(fire).toBeGreaterThan(0);
  });

  it('烧完以后整片都消失', () => {
    const world = oilBasin();
    setMaterial(world, 7 * 9 + 4, FIRE);

    for (let i = 0; i < FIRE_BURN_TICKS + 20; i += 1) stepWorld(world);

    let left = 0;
    for (let i = 0; i < world.cells.length; i += 1) {
      if (world.cells[i] === FIRE || world.cells[i] === OIL) left += 1;
    }
    expect(left).toBe(0);
  });
});
