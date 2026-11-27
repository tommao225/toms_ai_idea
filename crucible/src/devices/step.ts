import { AIR_ID, BEHAVIOR_CODE } from '../world/materials';
import { setMaterial, type DeviceInstance, type WorldState } from '../world/world';
import { DEVICES } from './definitions';

const DIRECTION_DX = [0, 1, 0, -1];
const DIRECTION_DY = [-1, 0, 1, 0];
const BEHAVIOR_LIQUID = 2;
const KIND_CLOSED = 1;
const KIND_LIQUID_ONLY = 2;

/**
 * 装置每 tick 的动作。装置只读写网格，彼此之间没有直接交互。
 * 由 app 在步进世界之前调用。
 *
 * 信号是广播式的：传感器以自身半径广播，范围内的装置被它接管，
 * 没有传感器覆盖的装置默认通电。阀门开合直接改写该格的阻挡等级。
 */
export function stepDevices(world: WorldState): void {
  updateSignals(world);

  for (const device of world.devices) {
    if (!device.enabled) continue;
    switch (DEVICES[device.type].key) {
      case 'emitter':
        stepEmitter(world, device);
        break;
      case 'heater':
        stepHeater(world, device);
        break;
      case 'pump':
        stepPump(world, device);
        break;
      default:
        // 管道、阀门、传感器没有主动动作
        break;
    }
  }
}

function updateSignals(world: WorldState): void {
  const sensors = world.devices.filter((device) => DEVICES[device.type].key === 'sensor');
  const active = sensors.map((sensor) => isSensorActive(world, sensor));

  for (const device of world.devices) {
    if (DEVICES[device.type].key === 'sensor') continue;
    let covered = false;
    let triggered = false;
    for (let i = 0; i < sensors.length; i += 1) {
      const sensor = sensors[i];
      const dx = sensor.x - device.x;
      const dy = sensor.y - device.y;
      if (dx * dx + dy * dy > sensor.radius * sensor.radius) continue;
      covered = true;
      if (active[i]) triggered = true;
    }
    device.enabled = !covered || triggered;
  }

  for (const device of world.devices) {
    if (DEVICES[device.type].key !== 'valve') continue;
    const index = device.y * world.width + device.x;
    world.deviceKind[index] = device.enabled ? KIND_LIQUID_ONLY : KIND_CLOSED;
  }
}

/** 传感器盯着自己下面那一格：物质对不对，或者温度到没到。 */
function isSensorActive(world: WorldState, sensor: DeviceInstance): boolean {
  const y = sensor.y + 1;
  if (y >= world.height) return false;
  const index = y * world.width + sensor.x;
  if (sensor.target !== 0 && world.cells[index] === sensor.target) return true;
  return world.temperature[index] >= sensor.temperature;
}

/** 每隔 interval 个 tick 往正下方吐一格物质。 */
function stepEmitter(world: WorldState, device: DeviceInstance): void {
  if (device.interval <= 0 || world.tick % device.interval !== 0) return;
  const x = device.x;
  const y = device.y + 1;
  if (y >= world.height) return;
  const index = y * world.width + x;
  if (world.deviceKind[index] !== 0) return;
  if (world.cells[index] !== AIR_ID) return;
  setMaterial(world, index, device.material);
}

/** 把半径内的温度抬到设定值。 */
function stepHeater(world: WorldState, device: DeviceInstance): void {
  const { width, height, temperature } = world;
  const radius = device.radius;
  const radiusSquared = radius * radius;

  for (let dy = -radius; dy <= radius; dy += 1) {
    const y = device.y + dy;
    if (y < 0 || y >= height) continue;
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx * dx + dy * dy > radiusSquared) continue;
      const x = device.x + dx;
      if (x < 0 || x >= width) continue;
      const index = y * width + x;
      if (temperature[index] < device.temperature) temperature[index] = device.temperature;
    }
  }
}

/** 把装置背后的液体推到装置前面的空格，相当于一次跨越。 */
function stepPump(world: WorldState, device: DeviceInstance): void {
  const dx = DIRECTION_DX[device.direction];
  const dy = DIRECTION_DY[device.direction];

  const behindX = device.x - dx;
  const behindY = device.y - dy;
  const frontX = device.x + dx;
  const frontY = device.y + dy;

  if (behindX < 0 || behindY < 0 || behindX >= world.width || behindY >= world.height) return;
  if (frontX < 0 || frontY < 0 || frontX >= world.width || frontY >= world.height) return;

  const behind = behindY * world.width + behindX;
  const front = frontY * world.width + frontX;

  const id = world.cells[behind];
  if (id === AIR_ID || BEHAVIOR_CODE[id] !== BEHAVIOR_LIQUID) return;
  const frontKind = world.deviceKind[front];
  // 前面可以是空气，也可以是管道——泵的作用就是把液体推进管道
  if (frontKind !== 0 && frontKind !== 2) return;
  if (world.cells[front] !== AIR_ID) return;

  const heat = world.temperature[behind];
  setMaterial(world, front, id, heat);
  setMaterial(world, behind, AIR_ID);
}
