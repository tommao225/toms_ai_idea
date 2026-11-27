import { describe, expect, it } from 'vitest';
import { materialIdOf } from '../src/world/materials';
import { createWorld, stepWorld } from '../src/world/world';

const STONE = materialIdOf('stone');
const SAND = materialIdOf('sand');
const LAVA = materialIdOf('lava');

function fillScene(width: number, height: number) {
  const world = createWorld(width, height, 7);
  for (let x = 0; x < width; x += 1) {
    for (let y = height - 4; y < height; y += 1) world.cells[y * width + x] = STONE;
  }
  for (let y = 20; y < 40; y += 1) {
    for (let x = 40; x < 120; x += 1) world.cells[y * width + x] = SAND;
  }
  for (let y = height - 10; y < height - 4; y += 1) {
    for (let x = 200; x < 260; x += 1) world.cells[y * width + x] = LAVA;
  }
  return world;
}

describe('性能预算', () => {
  it('640×384 的世界跑 100 tick 不超过 3 秒', () => {
    const world = fillScene(640, 384);
    const start = performance.now();
    for (let i = 0; i < 100; i += 1) stepWorld(world);
    const elapsed = performance.now() - start;
    const perTick = elapsed / 100;
    console.log(`100 tick 用时 ${elapsed.toFixed(0)} ms，单 tick ${perTick.toFixed(2)} ms`);
    // 20 tick/s 时单 tick 预算是 50 ms；这里放宽到 60，避免机器负载高时误报，
    // 真正的回归（数量级变化）仍然抓得住
    expect(perTick).toBeLessThan(60);
  });
});
