import {
  AIR_ID,
  BEHAVIOR_CODE,
  CONDUCTIVITY,
  DENSITY,
  DEFAULT_TEMPERATURE,
  HEAT_SOURCE,
  materialIdOf,
} from './materials';
import { CONTACT_A_TO, CONTACT_B_TO, CONTACT_HAS_RULE, REACTIONS } from './reactions';
import { Rng } from './rng';

export const MIN_TEMPERATURE = -200;
export const MAX_TEMPERATURE = 3000;

/** 火不是一种长期存在的物质，而是燃料烧起来的短暂状态。 */
export const FIRE_ID = materialIdOf('fire');
const OIL_ID = materialIdOf('oil');
/** 一团火烧多久，单位 tick。20 tick/s 下是 0.7 秒。 */
export const FIRE_BURN_TICKS = 14;
/** 火能隔多远点着油：2 表示每 tick 火线推进两格。 */
const FIRE_IGNITE_RADIUS = 2;
/** 火苗每秒往上蹿几格。 */
const FIRE_RISE = 1;

const BEHAVIOR_POWDER = 1;
const BEHAVIOR_LIQUID = 2;
const BEHAVIOR_GAS = 3;

/** 下落终速，单位是格每 tick。20 tick/s 下相当于每秒 200 格。 */
const MAX_FALL = 10;
/** 气体每 tick 最多上升几格。 */
const GAS_RISE = 2;
/** 液体落地后一 tick 最多横滑几格，用来快速摊平成最终形状。 */
const LIQUID_SPREAD = 10;
/** 粉末落地后一 tick 最多沿斜面滑几格。 */
const POWDER_SLIDE = 4;

export interface DeviceInstance {
  readonly type: number;
  readonly x: number;
  readonly y: number;
  /** 喷口喷什么。 */
  readonly material: number;
  /** 喷口间隔。 */
  readonly interval: number;
  /** 加热器温度，也当传感器的温度阈值。 */
  readonly temperature: number;
  /** 作用半径：加热范围或信号广播范围。 */
  readonly radius: number;
  /** 泵的方向，0 上 1 右 2 下 3 左。 */
  readonly direction: number;
  /** 传感器盯着的物质，0 表示只看温度。 */
  readonly target: number;
  /** 本 tick 是否通电。每 tick 重算，不进存档语义。 */
  enabled: boolean;
}

export interface WorldState {
  readonly width: number;
  readonly height: number;
  readonly cells: Uint8Array;
  /** 本 tick 已经处理过的格子，防止同一格一 tick 走多步。 */
  readonly moved: Uint8Array;
  /** 每格温度，单位摄氏度。 */
  readonly temperature: Int16Array;
  /** 本 tick 的溅射事件，纯表现用。 */
  readonly splashes: SplashEvent[];
  /** 每格的下落速度，0 到 MAX_FALL，用于自由落体加速。 */
  readonly fallSpeed: Uint8Array;
  /** 每列液面（最上面那格液体的 y），找平用，每 tick 重算。 */
  readonly surface: Int16Array;
  /** 每列最低的可落脚 y（最下面那格能进液体的格子），没有就是 −1。 */
  readonly restY: Int16Array;
  /** 这一格还要烧多久，只有火会用到。 */
  readonly burnTime: Uint8Array;
  /** 本 tick 已经反应过的格子，防止一格连反应两次。 */
  readonly reacted: Uint8Array;
  /** 本 tick 开始时就在烧的火格，新点着的不算火源。 */
  readonly fireBuffer: number[];
  /** 每格放着的装置类型加一，0 表示没有装置。 */
  readonly deviceCells: Uint8Array;
  /** 每格的装置阻挡等级：0 无，1 全挡，2 只让液体过。 */
  readonly deviceKind: Uint8Array;
  /** 场上所有装置的实例，按放置顺序排列。 */
  readonly devices: DeviceInstance[];
  tick: number;
  readonly rng: Rng;
}

/** 渲染与界面能拿到的只读面：只有查询，没有写入。 */
export interface WorldView {
  readonly width: number;
  readonly height: number;
  readonly tick: number;
  materialAt(x: number, y: number): number;
  temperatureAt(x: number, y: number): number;
  deviceAt(x: number, y: number): number;
  /** 渲染用的只读数组，逐像素画的时候比方法调用快得多。 */
  readonly cells: Uint8Array;
  readonly temperature: Int16Array;
  /** 火焰明暗要读燃烧剩余时间。 */
  readonly burnTime: Uint8Array;
  /** 本 tick 的溅射事件。 */
  readonly splashes: readonly SplashEvent[];
  /** 场上装置，渲染要按整块画，不能只画一格。 */
  readonly devices: readonly DeviceInstance[];
}

export function createWorld(width: number, height: number, seed: number): WorldState {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error(`世界尺寸无效：${width}×${height}`);
  }
  const size = width * height;
  return {
    width,
    height,
    cells: new Uint8Array(size),
    moved: new Uint8Array(size),
    temperature: new Int16Array(size).fill(DEFAULT_TEMPERATURE[AIR_ID]),
    fallSpeed: new Uint8Array(size),
    surface: new Int16Array(width).fill(-1),
    restY: new Int16Array(width).fill(-1),
    burnTime: new Uint8Array(size),
    reacted: new Uint8Array(size),
    splashes: [],
    fireBuffer: [],
    deviceCells: new Uint8Array(size),
    deviceKind: new Uint8Array(size),
    devices: [],
    tick: 0,
    rng: new Rng(seed),
  };
}

export function materialAt(world: WorldState, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) return AIR_ID;
  return world.cells[y * world.width + x];
}

export function temperatureAt(world: WorldState, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) return DEFAULT_TEMPERATURE[AIR_ID];
  return world.temperature[y * world.width + x];
}

export function deviceAt(world: WorldState, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) return 0;
  return world.deviceCells[y * world.width + x];
}

export function asView(world: WorldState): WorldView {
  return {
    get width() {
      return world.width;
    },
    get height() {
      return world.height;
    },
    get tick() {
      return world.tick;
    },
    materialAt(x: number, y: number) {
      return materialAt(world, x, y);
    },
    temperatureAt(x: number, y: number) {
      return temperatureAt(world, x, y);
    },
    deviceAt(x: number, y: number) {
      return deviceAt(world, x, y);
    },
    get devices() {
      return world.devices;
    },
    get cells() {
      return world.cells;
    },
    get temperature() {
      return world.temperature;
    },
    get burnTime() {
      return world.burnTime;
    },
    get splashes() {
      return world.splashes;
    },
  };
}

export function stepWorld(world: WorldState): void {
  world.moved.fill(0);
  world.reacted.fill(0);
  world.splashes.length = 0;
  stepDiffusion(world);
  stepHeatSources(world);
  stepContactReactions(world);
  stepFireSpread(world);
  stepTemperatureReactions(world);
  stepBurning(world);
  stepAmbient(world);
  stepMovement(world);
  stepLiquidSettle(world);
  // 移动完液面已经变了，找平必须用最新的液面数据，否则会差一格停下
  computeSurface(world);
  stepLiquidLeveling(world);
  world.tick += 1;
}

/** 一列被搬走最上面一格之后，新的液面在哪。 */
function nextSurface(world: WorldState, x: number, y: number): number {
  const next = y + 1;
  if (next >= world.height) return -1;
  const id = world.cells[next * world.width + x];
  return id !== AIR_ID && BEHAVIOR_CODE[id] === BEHAVIOR_LIQUID ? next : -1;
}

/**
 * 液面找平：按「这一段液体的平均深度」算一条上限，超过上限的列往旁边较浅的列搬。
 * 用平均深度而不是「比邻居高就搬」，是为了不抖：每个多余格都朝某个方向跑，跑到位就停。
 * 落差超过 MAX_LEVEL_DROP 的不搬，悬空液滴也不碰（归重力管）。
 */
function stepLiquidLeveling(world: WorldState): void {
  const { width, surface, restY } = world;

  let start = 0;
  while (start < width) {
    if (surface[start] < 0) {
      start += 1;
      continue;
    }
    let end = start;
    let total = 0;
    while (end < width && surface[end] >= 0) {
      total += restY[end] - surface[end] + 1;
      end += 1;
    }
    const limit = Math.ceil(total / (end - start));

    for (let pass = 0; pass < LEVELING_PASSES; pass += 1) {
      let shifted = false;
      for (let x = start; x + 1 < end; x += 1) {
        const left = surface[x];
        const right = surface[x + 1];
        const depthLeft = restY[x] - left + 1;
        const depthRight = restY[x + 1] - right + 1;

        if (depthLeft > limit && depthLeft > depthRight) {
          if (shiftDown(world, x, left, x + 1, right)) {
            surface[x] = nextSurface(world, x, left);
            surface[x + 1] = right - 1;
            shifted = true;
          }
        } else if (depthRight > limit && depthRight > depthLeft) {
          if (shiftDown(world, x + 1, right, x, left)) {
            surface[x] = left - 1;
            surface[x + 1] = nextSurface(world, x + 1, right);
            shifted = true;
          }
        }
      }
      if (!shifted) break;
    }
    start = end;
  }
}

/** 把 (fromX, fromY) 那一格液体搬到 fromX+step 那一列较浅的液面上。 */
function shiftDown(world: WorldState, fromX: number, fromY: number, toX: number, toY: number): boolean {
  const width = world.width;
  const drop = toY - fromY;
  if (drop < 1 || drop > MAX_LEVEL_DROP) return false;
  // 悬空的液滴归重力管，找平不碰它
  if (canLiquidEnter(world, fromY * width + fromX + width)) return false;
  if (world.fallSpeed[fromY * width + fromX] > 0) return false;

  const dst = (toY - 1) * width + toX;
  if (!canLiquidEnter(world, dst)) return false;
  moveTo(world, fromY * width + fromX, dst, 0);
  return true;
}

/**
 * 每一列里把重的液体往下压：上重下轻就换位。
 * 保证同一列里不会出现「水在油上面」这种反物理的堆叠。
 */
function stepLiquidSettle(world: WorldState): void {
  const { width, height, cells } = world;
  for (let x = 0; x < width; x += 1) {
    for (let y = height - 2; y >= 0; y -= 1) {
      const upper = y * width + x;
      const lower = upper + width;
      const upperId = cells[upper];
      const lowerId = cells[lower];
      if (upperId === AIR_ID || lowerId === AIR_ID) continue;
      if (BEHAVIOR_CODE[upperId] !== BEHAVIOR_LIQUID || BEHAVIOR_CODE[lowerId] !== BEHAVIOR_LIQUID) continue;
      if (DENSITY[upperId] > DENSITY[lowerId]) moveTo(world, upper, lower, 0);
    }
  }
}

/** 向环境温度缓慢散热：没有它，热量只会在网格里摊平，永远散不掉。 */
function stepAmbient(world: WorldState): void {
  const { cells, temperature } = world;
  for (let i = 0; i < temperature.length; i += 1) {
    if (HEAT_SOURCE[cells[i]] >= 0) continue; // 恒温热源自己保持温度，不参与散热
    const value = temperature[i];
    const diff = value - AMBIENT_TEMPERATURE;
    if (diff >= 1) {
      temperature[i] = value - Math.max(1, diff >> AMBIENT_SHIFT);
    } else if (diff <= -1) {
      temperature[i] = value + Math.max(1, (-diff) >> AMBIENT_SHIFT);
    }
  }
}

/** 记下每列最上面那格液体的 y，以及每列最低的可落脚位置。 */
function computeSurface(world: WorldState): void {
  const { width, height, cells, surface, restY, deviceKind } = world;
  surface.fill(-1);
  restY.fill(-1);

  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      const i = y * width + x;
      const id = cells[i];
      if (surface[x] === -1 && id !== AIR_ID && BEHAVIOR_CODE[id] === BEHAVIOR_LIQUID) surface[x] = y;
      // 能装液体的格子（空气、气体、液体本身、管道）里最靠下的那格，就是落点
      const passable =
        (deviceKind[i] === 0 || deviceKind[i] === 2) &&
        (id === AIR_ID || BEHAVIOR_CODE[id] === BEHAVIOR_GAS || BEHAVIOR_CODE[id] === BEHAVIOR_LIQUID);
      if (passable) restY[x] = y;
    }
  }
}

/** 写入一格物质：温度、速度、燃烧计时一起归位。 */
export function setMaterial(world: WorldState, index: number, material: number, temperature?: number): void {
  world.cells[index] = material;
  world.temperature[index] = temperature === undefined ? DEFAULT_TEMPERATURE[material] : temperature;
  world.fallSpeed[index] = 0;
  world.burnTime[index] = material === FIRE_ID ? FIRE_BURN_TICKS : 0;
}

/** 点火：把一格变成火，并给它一个燃烧计时。 */
export function ignite(world: WorldState, index: number): void {
  setMaterial(world, index, FIRE_ID);
}

// ---------------------------------------------------------------- 温度

function stepDiffusion(world: WorldState): void {
  const { width, height, temperature } = world;
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * width;
    for (let x = 0; x < width; x += 1) {
      const index = rowStart + x;
      if (x + 1 < width) exchangeHeat(world, temperature, index, index + 1);
      if (y + 1 < height) exchangeHeat(world, temperature, index, index + width);
    }
  }
}

/** 相邻两格交换热量。只用整数运算，保证同一局可复现。 */
function exchangeHeat(world: WorldState, temperature: Int16Array, a: number, b: number): void {
  const diff = temperature[a] - temperature[b];
  if (diff > -6 && diff < 6) return;
  const cells = world.cells;
  const conductivity = Math.min(CONDUCTIVITY[cells[a]], CONDUCTIVITY[cells[b]]);
  const flow = Math.trunc(diff / (12 - conductivity * 2));
  if (flow === 0) return;
  temperature[a] = clampTemperature(temperature[a] - flow);
  temperature[b] = clampTemperature(temperature[b] + flow);
}

function stepHeatSources(world: WorldState): void {
  const { cells, temperature } = world;
  for (let i = 0; i < cells.length; i += 1) {
    const source = HEAT_SOURCE[cells[i]];
    if (source >= 0 && temperature[i] < source) temperature[i] = source;
  }
}

function clampTemperature(value: number): number {
  if (value < MIN_TEMPERATURE) return MIN_TEMPERATURE;
  if (value > MAX_TEMPERATURE) return MAX_TEMPERATURE;
  return value;
}

// ---------------------------------------------------------------- 反应

function stepContactReactions(world: WorldState): void {
  const { width, height } = world;
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * width;
    for (let x = 0; x < width; x += 1) {
      const index = rowStart + x;
      if (x + 1 < width) applyContact(world, index, index + 1);
      if (y + 1 < height) applyContact(world, index, index + width);
    }
  }
}

function applyContact(world: WorldState, a: number, b: number): void {
  const { cells, temperature, reacted } = world;
  if (reacted[a] === 1 || reacted[b] === 1) return;
  const key = cells[a] * 256 + cells[b];
  if (CONTACT_HAS_RULE[key] === 0) return;
  const aTo = CONTACT_A_TO[key];
  const bTo = CONTACT_B_TO[key];
  const aHeat = temperature[a];
  const bHeat = temperature[b];

  setMaterial(world, a, aTo);
  setMaterial(world, b, bTo);
  reacted[a] = 1;
  reacted[b] = 1;

  // 产物至少到自己的初始温度；本来就比这更热就保留
  if (aHeat > temperature[a]) temperature[a] = aHeat;
  if (bHeat > temperature[b]) temperature[b] = bHeat;
}

/** 火按计时熄灭：烧完就变回空气，热量留在原地慢慢散。 */
function stepBurning(world: WorldState): void {
  const { cells, burnTime } = world;
  for (let i = 0; i < cells.length; i += 1) {
    if (cells[i] !== FIRE_ID) continue;
    if (burnTime[i] === 0) {
      burnTime[i] = FIRE_BURN_TICKS;
      continue;
    }
    burnTime[i] -= 1;
    if (burnTime[i] === 0) cells[i] = AIR_ID;
  }
}

/**
 * 火线推进：先记下本 tick 开始时就在烧的火格，再由这些火格去点着附近的油。
 * 只认这一份快照，所以新点着的火不会在同 tick 里再当火源——火是「扩散」，不是「瞬移烧穿」。
 * 另外隔墙点不着：两格外的那一格要先看中间有没有挡。
 */
function stepFireSpread(world: WorldState): void {
  const { width, height, cells, fireBuffer } = world;
  const radius = FIRE_IGNITE_RADIUS;
  const radiusSquared = radius * radius;

  fireBuffer.length = 0;
  for (let i = 0; i < cells.length; i += 1) {
    if (cells[i] === FIRE_ID) fireBuffer.push(i);
  }

  for (const index of fireBuffer) {
    const x = index % width;
    const y = (index - x) / width;
    for (let dy = -radius; dy <= radius; dy += 1) {
      const ny = y + dy;
      if (ny < 0 || ny >= height) continue;
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        if (dx * dx + dy * dy > radiusSquared) continue;
        const nx = x + dx;
        if (nx < 0 || nx >= width) continue;
        if (!hasLineOfSight(world, x, y, dx, dy)) continue;
        const ni = ny * width + nx;
        if (cells[ni] === OIL_ID) ignite(world, ni);
      }
    }
  }
}

/** 视线检查：半径 2 时只有正方向隔两格的情况需要看中间那一格。 */
function hasLineOfSight(world: WorldState, x: number, y: number, dx: number, dy: number): boolean {
  if (Math.abs(dx) + Math.abs(dy) !== 2) return true;
  if (dx % 2 !== 0 || dy % 2 !== 0) return true;
  const midX = x + dx / 2;
  const midY = y + dy / 2;
  if (midX < 0 || midY < 0 || midX >= world.width || midY >= world.height) return false;
  const mid = midY * world.width + midX;
  return world.cells[mid] === AIR_ID && world.deviceKind[mid] === 0;
}

function stepTemperatureReactions(world: WorldState): void {
  const { cells, temperature, reacted } = world;
  for (let i = 0; i < cells.length; i += 1) {
    if (reacted[i] === 1) continue;
    const rules = REACTIONS.temperatureByMaterial[cells[i]];
    if (rules.length === 0) continue;
    const value = temperature[i];
    for (let r = 0; r < rules.length; r += 1) {
      const rule = rules[r];
      if (rule.min !== null && value < rule.min) continue;
      if (rule.max !== null && value > rule.max) continue;
      cells[i] = rule.to;
      reacted[i] = 1;
      break;
    }
  }
}

// ---------------------------------------------------------------- 移动

function stepMovement(world: WorldState): void {
  const { width, height, cells } = world;

  // 粉末与液体自下而上，保证下落只走一格
  for (let y = height - 1; y >= 0; y -= 1) {
    const rowStart = y * width;
    for (let x = 0; x < width; x += 1) {
      const index = rowStart + x;
      if (world.moved[index] === 1) continue;
      const behavior = BEHAVIOR_CODE[cells[index]];
      if (behavior === BEHAVIOR_POWDER) stepPowder(world, x, y, index);
      else if (behavior === BEHAVIOR_LIQUID) stepLiquid(world, x, y, index);
    }
  }

  // 气体自上而下，保证上升只走一格
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * width;
    for (let x = 0; x < width; x += 1) {
      const index = rowStart + x;
      if (world.moved[index] === 1) continue;
      if (BEHAVIOR_CODE[cells[index]] !== BEHAVIOR_GAS) continue;
      stepGas(world, x, y, index);
    }
  }
}

/** 粉末能进：没有装置，且是空气、液体或气体。 */
function canPowderEnter(world: WorldState, index: number): boolean {
  if (world.deviceKind[index] !== 0) return false;
  const id = world.cells[index];
  if (id === AIR_ID) return true;
  const behavior = BEHAVIOR_CODE[id];
  return behavior === BEHAVIOR_LIQUID || behavior === BEHAVIOR_GAS;
}

/** 液体能进：没有装置或装置是管道，且是空气或气体。 */
function canLiquidEnter(world: WorldState, index: number): boolean {
  if (world.deviceKind[index] === 1) return false;
  const id = world.cells[index];
  if (id === AIR_ID) return true;
  return BEHAVIOR_CODE[id] === BEHAVIOR_GAS;
}

/** 气体能进：没有装置，且是空气。 */
function canGasEnter(world: WorldState, index: number): boolean {
  return world.deviceKind[index] === 0 && world.cells[index] === AIR_ID;
}

/** 气体能顶上去：没有装置，且是空气或液体。 */
function canGasRise(world: WorldState, index: number): boolean {
  if (world.deviceKind[index] !== 0) return false;
  const id = world.cells[index];
  if (id === AIR_ID) return true;
  return BEHAVIOR_CODE[id] === BEHAVIOR_LIQUID;
}

/** 每格每 tick 向环境温度靠一点，热量才有地方散掉。 */
const AMBIENT_TEMPERATURE = 20;
/** 越大散得越慢。取 6 表示差距的 1/64 每 tick。 */
const AMBIENT_SHIFT = 6;

/** 液体落地时至少要有这个下落速度才会溅起来。 */
const SPLASH_MIN_SPEED = 5;
/** 每 tick 最多记几条溅射，纯表现用，不参与模拟。 */
const MAX_SPLASHES = 24;
/** 相邻两列落差在这么多格以内才允许横向找平；更大落差交给重力和横向滑。 */
const MAX_LEVEL_DROP = 16;
/** 每 tick 最多做几轮找平。 */
const LEVELING_PASSES = 10;

/** 溅射事件：只给渲染用，不进快照也不进确定性哈希。 */
export interface SplashEvent {
  readonly x: number;
  readonly y: number;
  readonly power: number;
  /** 0 固体、1 液体、2 粉末、3 气体。 */
  readonly kind: number;
  /** 溅起来的是什么液体。 */
  readonly material: number;
} 

/** 这一格的液体撞到什么了：0 固体、1 液体、2 粉末、3 气体。 */
function impactKind(id: number): number {
  if (id === AIR_ID) return 3;
  const code = BEHAVIOR_CODE[id];
  if (code === BEHAVIOR_LIQUID) return 1;
  if (code === BEHAVIOR_POWDER) return 2;
  if (code === BEHAVIOR_GAS) return 3;
  return 0;
}

/** 粉末沿斜面向下滑，滑到滑不动为止，一 tick 最多 POWDER_SLIDE 格。 */
function slidePowder(world: WorldState, x: number, index: number, direction: number): number {
  const { width } = world;
  let cursor = index;
  for (let k = 1; k <= POWDER_SLIDE; k += 1) {
    const nx = x + direction * k;
    if (nx < 0 || nx >= width) break;
    const diagonal = cursor + width + direction;
    if (!canPowderEnter(world, diagonal)) break;
    cursor = diagonal;
  }
  return cursor;
}

/** 从这一格往这一列流过去，能不能落到更低的地方。 */
function canFlowTo(world: WorldState, x: number, y: number): boolean {
  if (x < 0 || x >= world.width) return false;
  const top = world.surface[x];
  // 空列：只要落点还在我下面，流过去就是净收益
  if (top < 0) return world.restY[x] > y;
  // 已经有液体的列：只有液面比我低两格以上才值得搬，不然只是两列来回换位
  return top >= y + 2;
}
/**
 * 液体在支撑面上横滑：沿这一行往前找一列「确实有落差」的地方，落到那里。
 * 没有落差就干脆不动，避免两列来回换位式的抖动。
 */
function slideLiquid(
  world: WorldState,
  x: number,
  y: number,
  index: number,
  direction: number,
  density: number,
): number {
  const { width, cells } = world;
  for (let k = 1; k <= LIQUID_SPREAD; k += 1) {
    const nx = x + direction * k;
    if (nx < 0 || nx >= width) break;
    const cellIndex = index + direction * k;
    const nextId = cells[cellIndex];

    // 旁边是比自己重的液体：先换位，轻的浮上去（和液面高低无关）
    if (nextId !== AIR_ID && BEHAVIOR_CODE[nextId] === BEHAVIOR_LIQUID) {
      if (k === 1 && DENSITY[nextId] > density) return cellIndex;
      break;
    }

    if (!canLiquidEnter(world, cellIndex)) break;
    if (canFlowTo(world, nx, y)) return cellIndex;
  }
  return index;
}

/** 沿空气一路往下能落多远。只穿空气，碰到液体或装置就停。 */
function freeFallDistance(world: WorldState, y: number, index: number, speed: number): number {
  const { width, height, cells } = world;
  let reach = 0;
  for (let k = 1; k <= speed; k += 1) {
    const ny = y + k;
    if (ny >= height) break;
    const ni = index + k * width;
    if (world.deviceKind[ni] !== 0) break;
    if (cells[ni] !== AIR_ID) break;
    reach = k;
  }
  return reach;
}

function stepPowder(world: WorldState, x: number, y: number, index: number): void {
  const { width, height, cells } = world;
  if (y + 1 >= height) {
    world.fallSpeed[index] = 0;
    return;
  }

  // 自由落体：速度每 tick 加一格，最多 MAX_FALL
  const speed = Math.min(MAX_FALL, world.fallSpeed[index] + 1);
  const reach = freeFallDistance(world, y, index, speed);
  if (reach > 0) {
    moveTo(world, index, index + reach * width, speed);
    return;
  }

  const below = index + width;
  const belowId = cells[below];
  if (
    belowId !== AIR_ID &&
    world.deviceKind[below] === 0 &&
    (BEHAVIOR_CODE[belowId] === BEHAVIOR_LIQUID || BEHAVIOR_CODE[belowId] === BEHAVIOR_GAS)
  ) {
    // 沉进液体、穿过气体：一次一格，不加速
    moveTo(world, index, below, 1);
    return;
  }

  const dir = world.rng.next() < 0.5 ? 1 : -1;
  const first = slidePowder(world, x, index, dir);
  if (first !== index) {
    moveTo(world, index, first, 1);
    return;
  }
  const second = slidePowder(world, x, index, -dir);
  if (second !== index) {
    moveTo(world, index, second, 1);
    return;
  }

  world.fallSpeed[index] = 0;
}

function stepLiquid(world: WorldState, x: number, y: number, index: number): void {
  const { width, height, cells } = world;
  if (y + 1 >= height) {
    world.fallSpeed[index] = 0;
    return;
  }

  const speed = Math.min(MAX_FALL, world.fallSpeed[index] + 1);
  const reach = freeFallDistance(world, y, index, speed);
  if (reach > 0) {
    moveTo(world, index, index + reach * width, speed);
    return;
  }

  const below = index + width;
  const belowId = cells[below];
  // 砸到东西的那一下：记一条溅射给渲染用（撞固体溅得高，落进水里只是闷一下）
  const impactSpeed = world.fallSpeed[index];
  if (impactSpeed >= SPLASH_MIN_SPEED && world.splashes.length < MAX_SPLASHES) {
    world.splashes.push({ x, y: y + 1, power: impactSpeed, kind: impactKind(belowId), material: cells[index] });
  }

  // 重的液体往下沉，把轻的顶上去：油浮在水面就是这条
  if (
    belowId !== AIR_ID &&
    BEHAVIOR_CODE[belowId] === BEHAVIOR_LIQUID &&
    DENSITY[belowId] < DENSITY[cells[index]]
  ) {
    moveTo(world, index, below, 1);
    return;
  }

  if (canLiquidEnter(world, below)) {
    // 下方是气体：顶掉一格
    moveTo(world, index, below, 1);
    return;
  }

  const dir = world.rng.next() < 0.5 ? 1 : -1;
  if (x + dir >= 0 && x + dir < width && canLiquidEnter(world, below + dir)) {
    moveTo(world, index, below + dir, 1);
    return;
  }
  if (x - dir >= 0 && x - dir < width && canLiquidEnter(world, below - dir)) {
    moveTo(world, index, below - dir, 1);
    return;
  }

  // 有支撑时找一列真有落差的地方流过去；左右随机，避免整体朝一边漂
  const density = DENSITY[cells[index]];
  const first = world.rng.next() < 0.5 ? 1 : -1;
  let target = slideLiquid(world, x, y, index, first, density);
  if (target === index) target = slideLiquid(world, x, y, index, -first, density);
  if (target !== index) {
    moveTo(world, index, target, 0);
    return;
  }

  world.fallSpeed[index] = 0;
}

function stepGas(world: WorldState, x: number, y: number, index: number): void {
  const { width, cells } = world;
  // 火苗蹿得比蒸汽慢，看起来才像在烧
  const rise = cells[index] === FIRE_ID ? FIRE_RISE : GAS_RISE;

  // 上升，只穿空气
  let reach = 0;
  for (let k = 1; k <= rise; k += 1) {
    const ny = y - k;
    if (ny < 0) break;
    const ni = index - k * width;
    if (world.deviceKind[ni] !== 0) break;
    if (cells[ni] !== AIR_ID) break;
    reach = k;
  }
  if (reach > 0) {
    moveTo(world, index, index - reach * width, 0);
    return;
  }

  if (y > 0) {
    const above = index - width;
    if (canGasRise(world, above)) {
      moveTo(world, index, above, 0);
      return;
    }
    const dir = world.rng.next() < 0.5 ? 1 : -1;
    if (x + dir >= 0 && x + dir < width && canGasRise(world, above + dir)) {
      moveTo(world, index, above + dir, 0);
      return;
    }
    if (x - dir >= 0 && x - dir < width && canGasRise(world, above - dir)) {
      moveTo(world, index, above - dir, 0);
      return;
    }
  }

  const dir = world.rng.next() < 0.5 ? 1 : -1;
  if (x + dir >= 0 && x + dir < width && canGasEnter(world, index + dir)) {
    moveTo(world, index, index + dir, 0);
    return;
  }
  if (x - dir >= 0 && x - dir < width && canGasEnter(world, index - dir)) {
    moveTo(world, index, index - dir, 0);
  }
}

/** 把 a 的物质连温度一起搬到 b；被顶开的物质留在 a，速度清零。 */
function moveTo(world: WorldState, a: number, b: number, speed: number): void {
  const { cells, moved, temperature, fallSpeed, burnTime } = world;
  const cell = cells[a];
  cells[a] = cells[b];
  cells[b] = cell;

  const heat = temperature[a];
  temperature[a] = temperature[b];
  temperature[b] = heat;

  // 燃烧计时跟着火苗一起走
  const life = burnTime[a];
  burnTime[a] = burnTime[b];
  burnTime[b] = life;

  fallSpeed[a] = 0;
  fallSpeed[b] = speed > MAX_FALL ? MAX_FALL : speed;
  moved[b] = 1;
}

/** 稳定哈希，用来验证「同一输入跑出同一结果」。 */
export function hashWorld(world: WorldState): number {
  let hash = 2166136261;
  const { cells, temperature, fallSpeed, burnTime } = world;
  for (let i = 0; i < cells.length; i += 1) {
    hash ^= cells[i];
    hash = Math.imul(hash, 16777619);
  }
  for (let i = 0; i < temperature.length; i += 1) {
    hash ^= temperature[i] & 0xffff;
    hash = Math.imul(hash, 16777619);
  }
  for (let i = 0; i < fallSpeed.length; i += 1) {
    hash ^= fallSpeed[i];
    hash = Math.imul(hash, 16777619);
  }
  for (let i = 0; i < burnTime.length; i += 1) {
    hash ^= burnTime[i];
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
