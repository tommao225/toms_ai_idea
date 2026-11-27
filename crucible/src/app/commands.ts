import { DEVICE_KIND_CODE, DEVICES, createDeviceInstance } from '../devices/definitions';
import { AIR_ID, MATERIALS } from '../world/materials';
import { setMaterial, type WorldState } from '../world/world';

/** 从界面进入世界的唯一通道。命令是纯数据，可序列化。 */
export type Command =
  | {
      readonly type: 'place';
      readonly x: number;
      readonly y: number;
      readonly brush: number;
      readonly material: number;
    }
  | { readonly type: 'erase'; readonly x: number; readonly y: number; readonly brush: number }
  | {
      readonly type: 'fill';
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
      readonly material: number;
    }
  | { readonly type: 'place-device'; readonly device: number; readonly x: number; readonly y: number }
  | { readonly type: 'remove-device'; readonly x: number; readonly y: number }
  | { readonly type: 'clear' };

export function applyCommand(world: WorldState, command: Command): void {
  if (command.type === 'clear') {
    const airTemperature = MATERIALS[AIR_ID].temperature;
    world.cells.fill(AIR_ID);
    world.temperature.fill(airTemperature);
    world.fallSpeed.fill(0);
    world.burnTime.fill(0);
    world.deviceCells.fill(0);
    world.deviceKind.fill(0);
    world.devices.length = 0;
    world.moved.fill(0);
    return;
  }

  if (command.type === 'fill') {
    fillRect(world, command.x, command.y, command.width, command.height, command.material);
    return;
  }

  if (command.type === 'place-device') {
    placeDevice(world, command.device, command.x, command.y);
    return;
  }

  if (command.type === 'remove-device') {
    removeDevice(world, command.x, command.y);
    return;
  }

  const material = command.type === 'erase' ? AIR_ID : command.material;
  paintDisc(world, command.x, command.y, command.brush, material);
}

/** 放置物质时连同它的初始温度一起写入，否则冰块放下去会立刻融化。 */
function setCell(world: WorldState, x: number, y: number, material: number): void {
  const index = y * world.width + x;
  // 热源格（岩浆、火）不能被画笔直接覆盖或擦掉：只能等它反应或烧完
  if (MATERIALS[world.cells[index]].heatSource !== null) return;
  setMaterial(world, index, material);
}

function fillRect(world: WorldState, x0: number, y0: number, width: number, height: number, material: number): void {
  const startX = Math.max(0, Math.floor(x0));
  const startY = Math.max(0, Math.floor(y0));
  const endX = Math.min(world.width, Math.floor(x0 + width));
  const endY = Math.min(world.height, Math.floor(y0 + height));

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) setCell(world, x, y, material);
  }
}

function paintDisc(world: WorldState, centerX: number, centerY: number, brush: number, material: number): void {
  const radius = Math.max(0, Math.floor(brush));
  const radiusSquared = radius * radius;

  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx * dx + dy * dy > radiusSquared) continue;
      const x = centerX + dx;
      const y = centerY + dy;
      if (x < 0 || y < 0 || x >= world.width || y >= world.height) continue;
      setCell(world, x, y, material);
    }
  }
}

function placeDevice(world: WorldState, deviceType: number, x: number, y: number): void {
  const def = DEVICES[deviceType];
  if (!def) return;
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) return;

  const index = y * world.width + x;
  if (world.deviceCells[index] !== 0) return;

  world.devices.push(createDeviceInstance(def, x, y));
  world.deviceCells[index] = deviceType + 1;
  world.deviceKind[index] = DEVICE_KIND_CODE[deviceType];
}

function removeDevice(world: WorldState, x: number, y: number): void {
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) return;
  const index = y * world.width + x;
  if (world.deviceCells[index] === 0) return;

  const at = world.devices.findIndex((device) => device.x === x && device.y === y);
  if (at >= 0) world.devices.splice(at, 1);

  world.deviceCells[index] = 0;
  world.deviceKind[index] = 0;
}
