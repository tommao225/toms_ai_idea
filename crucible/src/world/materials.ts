import air from '../../data/materials/air.json';
import stone from '../../data/materials/stone.json';
import sand from '../../data/materials/sand.json';
import water from '../../data/materials/water.json';
import lava from '../../data/materials/lava.json';
import steam from '../../data/materials/steam.json';
import ice from '../../data/materials/ice.json';
import glass from '../../data/materials/glass.json';
import oil from '../../data/materials/oil.json';
import fire from '../../data/materials/fire.json';

export type Behavior = 'static' | 'powder' | 'liquid' | 'gas';

export interface MaterialDef {
  readonly id: number;
  readonly key: string;
  readonly name: string;
  readonly color: string;
  readonly behavior: Behavior;
  readonly placeable: boolean;
  /** 新生成时的温度，单位摄氏度。 */
  readonly temperature: number;
  /** 导热系数，1 到 4，数字越大传热越快。 */
  readonly conductivity: number;
  /** 密度：液体之间靠它决定谁沉谁浮，其它形态填 0。 */
  readonly density: number;
  /** 有值时每 tick 把温度抬到不低于它，相当于恒温热源。 */
  readonly heatSource: number | null;
}

const BEHAVIORS: readonly Behavior[] = ['static', 'powder', 'liquid', 'gas'];
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const MIN_TEMPERATURE = -200;
const MAX_TEMPERATURE = 3000;

function fail(where: string, reason: string): never {
  throw new Error(`物质数据有误，${where}：${reason}`);
}

function readString(raw: Record<string, unknown>, field: string, where: string): string {
  const value = raw[field];
  if (typeof value !== 'string' || value.length === 0) fail(where, `${field} 必须是非空字符串`);
  return value;
}

function readInteger(raw: Record<string, unknown>, field: string, where: string, min: number, max: number): number {
  const value = raw[field];
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    fail(where, `${field} 必须是 ${min} 到 ${max} 之间的整数`);
  }
  return value;
}

function readBehavior(raw: Record<string, unknown>, where: string): Behavior {
  const value = raw.behavior;
  if (typeof value !== 'string' || !BEHAVIORS.includes(value as Behavior)) {
    fail(where, `behavior 只能是 ${BEHAVIORS.join('、')}`);
  }
  return value as Behavior;
}

function readBoolean(raw: Record<string, unknown>, field: string, where: string): boolean {
  const value = raw[field];
  if (typeof value !== 'boolean') fail(where, `${field} 必须是布尔值`);
  return value;
}

function readHeatSource(raw: Record<string, unknown>, where: string): number | null {  const value = raw.heatSource;
  if (value === undefined || value === null) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > MAX_TEMPERATURE) {
    fail(where, `heatSource 必须是 1 到 ${MAX_TEMPERATURE} 之间的整数`);
  }
  return value;
}

/** 非液体的密度：写了就读，没写算 0（不参与浮沉比较）。 */
function decideDensity(raw: Record<string, unknown>, where: string): number {
  const value = raw.density;
  if (value === undefined) return 0;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    fail(where, 'density 必须是非负整数');
  }
  return value;
}

/** 逐条校验。id 必须从 0 连续，数组下标就是物质编号。 */
function validate(sources: readonly unknown[]): readonly MaterialDef[] {
  const seenKey = new Set<string>();
  const result: MaterialDef[] = [];

  sources.forEach((source, index) => {
    const where = `第 ${index + 1} 条`;
    if (typeof source !== 'object' || source === null) fail(where, '必须是对象');
    const raw = source as Record<string, unknown>;

    const id = readInteger(raw, 'id', where, 0, 255);
    if (id !== index) fail(where, `id 必须是 ${index}，与实际数据对不上`);
    const key = readString(raw, 'key', where);
    if (seenKey.has(key)) fail(where, `key 重复：${key}`);
    seenKey.add(key);
    const name = readString(raw, 'name', where);
    const color = readString(raw, 'color', where);
    if (!COLOR_PATTERN.test(color)) fail(where, `color 必须是 #rrggbb：${color}`);
    const behavior = readBehavior(raw, where);
    const placeable = readBoolean(raw, 'placeable', where);
    const temperature = readInteger(raw, 'temperature', where, MIN_TEMPERATURE, MAX_TEMPERATURE);
    const conductivity = readInteger(raw, 'conductivity', where, 1, 4);
    const heatSource = readHeatSource(raw, where);
    // 液体必须有密度，否则没法决定谁浮在谁上面
    const density =
      behavior === 'liquid' ? readInteger(raw, 'density', where, 1, 5000) : decideDensity(raw, where);

    result.push({
      id,
      key,
      name,
      color,
      behavior,
      placeable,
      temperature,
      conductivity,
      density,
      heatSource,
    });
  });

  return result;
}

export const MATERIALS: readonly MaterialDef[] = validate([
  air,
  stone,
  sand,
  water,
  lava,
  steam,
  ice,
  glass,
  oil,
  fire,
]);

export const AIR_ID = 0;

export const materialById = (id: number): MaterialDef => {
  const def = MATERIALS[id];
  if (!def) throw new Error(`未知物质编号：${id}`);
  return def;
};

export const materialIdOf = (key: string): number => {
  const found = MATERIALS.find((def) => def.key === key);
  if (!found) throw new Error(`未知物质：${key}`);
  return found.id;
};

/**
 * 按编号索引的派生表。热循环里读这些 TypedArray，
 * 比每次取 MATERIALS[id].xxx 快得多，也省得引擎去查属性。
 */
export const BEHAVIOR_CODE = Uint8Array.from(
  MATERIALS.map((def) => ({ static: 0, powder: 1, liquid: 2, gas: 3 })[def.behavior]),
);
export const CONDUCTIVITY = Uint8Array.from(MATERIALS.map((def) => def.conductivity));
export const DENSITY = Uint16Array.from(MATERIALS.map((def) => def.density));
export const DEFAULT_TEMPERATURE = Int16Array.from(MATERIALS.map((def) => def.temperature));
export const HEAT_SOURCE = Int16Array.from(MATERIALS.map((def) => (def.heatSource === null ? -1 : def.heatSource)));

