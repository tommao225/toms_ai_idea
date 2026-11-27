import emitter from '../../data/devices/emitter.json';
import heater from '../../data/devices/heater.json';
import pipe from '../../data/devices/pipe.json';
import pump from '../../data/devices/pump.json';
import valve from '../../data/devices/valve.json';
import sensor from '../../data/devices/sensor.json';
import { materialIdOf } from '../world/materials';
import type { DeviceInstance } from '../world/world';

export type DeviceKind = 'solid' | 'pipe';

export interface DeviceDef {
  readonly id: number;
  readonly key: string;
  readonly name: string;
  readonly color: string;
  readonly kind: DeviceKind;
  /** 喷口喷什么物质。 */
  readonly material: number | null;
  /** 喷口每隔多少 tick 喷一次。 */
  readonly interval: number;
  /** 加热器把范围内的温度抬到多少；传感器用它当温度阈值。 */
  readonly temperature: number;
  /** 作用半径：加热器是加热范围，传感器是广播范围。 */
  readonly radius: number;
  /** 泵把物质往哪个方向推，0 上 1 右 2 下 3 左。 */
  readonly direction: number;
  /** 传感器盯着的物质，0 表示只看温度。 */
  readonly target: number | null;
}

const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const KINDS: readonly DeviceKind[] = ['solid', 'pipe'];
/** defaults 里允许出现的键，出现别的就报错，避免键名写错被静默忽略。 */
const KNOWN_DEFAULT_KEYS = new Set(['material', 'interval', 'temperature', 'radius', 'direction', 'target']);

function fail(where: string, reason: string): never {
  throw new Error(`装置数据有误，${where}：${reason}`);
}

function readDefaults(raw: Record<string, unknown>, where: string): Record<string, unknown> {
  const value = raw.defaults;
  if (value === undefined) return {};
  if (typeof value !== 'object' || value === null) fail(where, 'defaults 必须是对象');
  return value as Record<string, unknown>;
}

function readNumber(source: Record<string, unknown>, field: string, fallback: number, where: string): number {
  const value = source[field];
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(where, `${field} 必须是数字`);
  return value;
}

function validate(sources: readonly unknown[]): readonly DeviceDef[] {
  const seen = new Set<string>();
  const result: DeviceDef[] = [];

  sources.forEach((source, index) => {
    const where = `第 ${index + 1} 条`;
    if (typeof source !== 'object' || source === null) fail(where, '必须是对象');
    const raw = source as Record<string, unknown>;

    if (raw.id !== index) fail(where, `id 必须是 ${index}`);
    const key = raw.key;
    if (typeof key !== 'string' || key.length === 0) fail(where, 'key 必须是非空字符串');
    if (seen.has(key)) fail(where, `key 重复：${key}`);
    seen.add(key);
    const name = raw.name;
    if (typeof name !== 'string' || name.length === 0) fail(where, 'name 必须是非空字符串');
    const color = raw.color;
    if (typeof color !== 'string' || !COLOR_PATTERN.test(color)) fail(where, 'color 必须是 #rrggbb');
    const kind = raw.kind;
    if (typeof kind !== 'string' || !KINDS.includes(kind as DeviceKind)) fail(where, 'kind 只能是 solid 或 pipe');

    const defaults = readDefaults(raw, where);
    for (const key of Object.keys(defaults)) {
      if (!KNOWN_DEFAULT_KEYS.has(key)) fail(where, `defaults 里有不认识的键：${key}`);
    }
    const materialKey = defaults.material;
    const material = typeof materialKey === 'string' ? materialIdOf(materialKey) : null;
    const targetKey = defaults.target;
    const target = typeof targetKey === 'string' ? materialIdOf(targetKey) : null;

    result.push({
      id: index,
      key,
      name,
      color,
      kind: kind as DeviceKind,
      material,
      interval: Math.max(1, Math.round(readNumber(defaults, 'interval', 6, where))),
      temperature: Math.round(readNumber(defaults, 'temperature', 900, where)),
      radius: Math.max(1, Math.round(readNumber(defaults, 'radius', 6, where))),
      direction: ((Math.round(readNumber(defaults, 'direction', 1, where)) % 4) + 4) % 4,
      target,
    });
  });

  return result;
}

export const DEVICES: readonly DeviceDef[] = validate([emitter, heater, pipe, pump, valve, sensor]);

export function deviceById(type: number): DeviceDef {
  const def = DEVICES[type];
  if (!def) throw new Error(`未知装置编号：${type}`);
  return def;
}

export function deviceIdOf(key: string): number {
  const found = DEVICES.find((def) => def.key === key);
  if (!found) throw new Error(`未知装置：${key}`);
  return found.id;
}

/** 移动与渲染用的快速查表。0 不挡，1 全挡，2 让液体过，3 是阀门（每 tick 由信号改写）。 */
export const DEVICE_KIND_CODE = Uint8Array.from(
  DEVICES.map((def) => {
    if (def.kind === 'pipe') return 2;
    if (def.key === 'valve') return 3;
    return 1;
  }),
);

export function createDeviceInstance(def: DeviceDef, x: number, y: number): DeviceInstance {
  return {
    type: def.id,
    x,
    y,
    material: def.material ?? 0,
    interval: def.interval,
    temperature: def.temperature,
    radius: def.radius,
    direction: def.direction,
    target: def.target ?? 0,
    enabled: true,
  };
}
