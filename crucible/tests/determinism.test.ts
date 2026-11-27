import { describe, expect, it } from 'vitest';
import { applyCommand, type Command } from '../src/app/commands';
import { MATERIALS } from '../src/world/materials';
import { restoreSnapshot, takeSnapshot } from '../src/world/snapshot';
import { createWorld, hashWorld, stepWorld } from '../src/world/world';

function id(key: string): number {
  const def = MATERIALS.find((item) => item.key === key);
  if (!def) throw new Error(`缺少物质：${key}`);
  return def.id;
}

const SAND = id('sand');
const STONE = id('stone');
const WATER = id('water');

const SCENE: readonly Command[] = [
  { type: 'fill', x: 0, y: 26, width: 60, height: 4, material: STONE },
  { type: 'fill', x: 0, y: 0, width: 2, height: 30, material: STONE },
  { type: 'place', x: 18, y: 6, brush: 6, material: SAND },
  { type: 'place', x: 38, y: 8, brush: 5, material: WATER },
  { type: 'place', x: 48, y: 10, brush: 4, material: SAND },
];

function build(seed: number): ReturnType<typeof createWorld> {
  const world = createWorld(60, 30, seed);
  for (const command of SCENE) applyCommand(world, command);
  return world;
}

describe('确定性', () => {
  it('同一场景、同一命令、同一种子跑出同一结果', () => {
    const a = build(2026);
    const b = build(2026);
    expect(hashWorld(a)).toBe(hashWorld(b));

    for (let i = 0; i < 300; i += 1) {
      stepWorld(a);
      stepWorld(b);
    }
    expect(a.tick).toBe(b.tick);
    expect(hashWorld(a)).toBe(hashWorld(b));
  });

  it('世界确实在变化，哈希不会一直不变', () => {
    const world = build(11);
    const before = hashWorld(world);
    for (let i = 0; i < 30; i += 1) stepWorld(world);
    expect(hashWorld(world)).not.toBe(before);
  });
});

describe('快照', () => {
  it('恢复快照后重跑，结果与没撤销时一致', () => {
    const world = build(77);
    const snapshot = takeSnapshot(world);

    for (let i = 0; i < 200; i += 1) stepWorld(world);
    const expected = hashWorld(world);

    restoreSnapshot(world, snapshot);
    expect(world.tick).toBe(snapshot.tick);

    for (let i = 0; i < 200; i += 1) stepWorld(world);
    expect(hashWorld(world)).toBe(expected);
  });

  it('快照恢复也会还原随机源状态', () => {
    const world = build(5);
    for (let i = 0; i < 10; i += 1) stepWorld(world);
    const snapshot = takeSnapshot(world);
    const stateAtSnapshot = world.rng.state;

    for (let i = 0; i < 10; i += 1) stepWorld(world);
    restoreSnapshot(world, snapshot);

    expect(world.rng.state).toBe(stateAtSnapshot);
  });
});
