import { describe, expect, it } from 'vitest';
import { materialIdOf } from '../src/world/materials';
import { createWorld, materialAt, stepWorld, type WorldState } from '../src/world/world';

const STONE = materialIdOf('stone');
const SAND = materialIdOf('sand');
const WATER = materialIdOf('water');
const LAVA = materialIdOf('lava');
const STEAM = materialIdOf('steam');
const ICE = materialIdOf('ice');
const GLASS = materialIdOf('glass');
const OIL = materialIdOf('oil');
const FIRE = materialIdOf('fire');

/** 整块石头的世界，中心可以用来放受测物质，四周跑不动。 */
function solidWorld(size = 3): WorldState {
  const world = createWorld(size, size, 1);
  world.cells.fill(STONE);
  world.temperature.fill(20);
  return world;
}

function center(world: WorldState): number {
  return Math.floor(world.height / 2) * world.width + Math.floor(world.width / 2);
}

describe('温度反应', () => {
  it('水烧开变蒸汽', () => {
    const world = solidWorld();
    const index = center(world);
    world.cells[index] = WATER;
    world.temperature[index] = 600;
    stepWorld(world);
    expect(world.cells[index]).toBe(STEAM);
  });

  it('蒸汽低于 100 度凝成水', () => {
    const world = solidWorld();
    const index = center(world);
    world.cells[index] = STEAM;
    world.temperature[index] = 50;
    stepWorld(world);
    expect(world.cells[index]).toBe(WATER);
  });

  it('沙到 800 度变玻璃', () => {
    const world = solidWorld();
    const index = center(world);
    world.cells[index] = SAND;
    world.temperature[index] = 1500;
    stepWorld(world);
    expect(world.cells[index]).toBe(GLASS);
  });

  it('冰在零上化成水', () => {
    const world = solidWorld();
    const index = center(world);
    world.cells[index] = ICE;
    world.temperature[index] = 5;
    stepWorld(world);
    expect(world.cells[index]).toBe(WATER);
  });

  it('水在零下结成冰', () => {
    const world = solidWorld();
    const index = center(world);
    world.cells[index] = WATER;
    world.temperature[index] = -100;
    stepWorld(world);
    expect(world.cells[index]).toBe(ICE);
  });
});

describe('接触反应', () => {
  it('岩浆遇到水变成石头和蒸汽', () => {
    const world = solidWorld(3);
    const left = 1 * 3 + 1;
    const right = 1 * 3 + 2;
    world.cells[left] = LAVA;
    world.cells[right] = WATER;
    stepWorld(world);
    expect(world.cells[left]).toBe(STONE);
    expect(world.cells[right]).toBe(STEAM);
  });

  it('油遇到火会烧起来', () => {
    const world = solidWorld(3);
    const left = 1 * 3 + 1;
    const right = 1 * 3 + 2;
    world.cells[left] = OIL;
    world.cells[right] = FIRE;
    world.temperature[right] = 900;
    stepWorld(world);
    expect(world.cells[left]).toBe(FIRE);
    expect(world.cells[right]).toBe(FIRE);
  });

  it('水会把火浇灭', () => {
    const world = solidWorld(3);
    const left = 1 * 3 + 1;
    const right = 1 * 3 + 2;
    world.cells[left] = FIRE;
    world.cells[right] = WATER;
    world.temperature[left] = 900;
    stepWorld(world);
    const pair = [world.cells[left], world.cells[right]];
    expect(pair).not.toContain(FIRE);
    expect(pair).toContain(STEAM);
  });
});

describe('热量传播', () => {
  it('岩浆会把旁边的空气烤热', () => {
    const world = createWorld(5, 5, 1);
    world.cells[0] = LAVA;
    world.temperature[0] = 1200;
    stepWorld(world);
    expect(world.temperature[1]).toBeGreaterThan(20);
  });

  it('没有热源时温度不会凭空变化', () => {
    const world = createWorld(7, 7, 1);
    world.cells[0] = STONE;
    const before = world.temperature[24];
    stepWorld(world);
    expect(world.temperature[24]).toBe(before);
  });
});

describe('气体', () => {
  it('蒸汽一次能往上飘两格', () => {
    const world = createWorld(3, 5, 1);
    world.cells[4 * 3 + 1] = STEAM;
    world.temperature[4 * 3 + 1] = 400;
    stepWorld(world);
    expect(materialAt(world, 1, 2)).toBe(STEAM);
  });
});
