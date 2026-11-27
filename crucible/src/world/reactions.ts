import rawTable from '../../data/reactions/reactions.json';
import { MATERIALS, materialIdOf } from './materials';

export interface TemperatureRule {
  readonly from: number;
  readonly to: number;
  readonly min: number | null;
  readonly max: number | null;
}

export interface ReactionTable {
  /** 按物质编号索引的温度规则，顺序即优先级。 */
  readonly temperatureByMaterial: readonly (readonly TemperatureRule[])[];
}

/**
 * 接触反应查表：索引是 a * 256 + b，值为 0 表示没有规则。
 * 用 TypedArray 而不是 Map，热循环里快一截。
 */
export const CONTACT_HAS_RULE = new Uint8Array(256 * 256);
export const CONTACT_A_TO = new Uint8Array(256 * 256);
export const CONTACT_B_TO = new Uint8Array(256 * 256);

const rawData = rawTable as { temperature: unknown[]; contact: unknown[] };

function fail(where: string, reason: string): never {
  throw new Error(`反应表有误，${where}：${reason}`);
}

function readMaterial(raw: Record<string, unknown>, field: string, where: string): number {
  const value = raw[field];
  if (typeof value !== 'string' || value.length === 0) fail(where, `${field} 必须是物质 key`);
  try {
    return materialIdOf(value);
  } catch {
    fail(where, `${field} 指向不存在的物质：${value}`);
  }
}

function readBound(raw: Record<string, unknown>, field: string, where: string): number | null {
  const value = raw[field];
  if (value === undefined) return null;
  if (typeof value !== 'number' || !Number.isInteger(value)) fail(where, `${field} 必须是整数`);
  return value;
}

function build(): ReactionTable {
  const temperatureByMaterial: TemperatureRule[][] = MATERIALS.map(() => []);

  rawData.temperature.forEach((item, index) => {
    const where = `temperature 第 ${index + 1} 条`;
    if (typeof item !== 'object' || item === null) fail(where, '必须是对象');
    const rule = item as Record<string, unknown>;
    const from = readMaterial(rule, 'from', where);
    const to = readMaterial(rule, 'to', where);
    const min = readBound(rule, 'min', where);
    const max = readBound(rule, 'max', where);
    if (min === null && max === null) fail(where, 'min 与 max 至少要有一个');
    if (from === to) fail(where, 'from 与 to 不能相同');
    temperatureByMaterial[from].push({ from, to, min, max });
  });

  rawData.contact.forEach((item, index) => {
    const where = `contact 第 ${index + 1} 条`;
    if (typeof item !== 'object' || item === null) fail(where, '必须是对象');
    const rule = item as Record<string, unknown>;
    const a = readMaterial(rule, 'from', where);
    const b = readMaterial(rule, 'with', where);
    const aTo = readMaterial(rule, 'fromTo', where);
    const bTo = readMaterial(rule, 'withTo', where);
    if (a === b) fail(where, 'from 与 with 不能相同');
    // 相邻没有方向，两个顺序都要能命中
    for (const [x, y, xTo, yTo] of [
      [a, b, aTo, bTo],
      [b, a, bTo, aTo],
    ] as const) {
      const key = x * 256 + y;
      CONTACT_HAS_RULE[key] = 1;
      CONTACT_A_TO[key] = xTo;
      CONTACT_B_TO[key] = yTo;
    }
  });

  return { temperatureByMaterial };
}

export const REACTIONS: ReactionTable = build();
