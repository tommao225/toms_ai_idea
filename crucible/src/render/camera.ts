export interface VisibleRect {
  readonly x0: number;
  readonly y0: number;
  readonly cols: number;
  readonly rows: number;
}

export interface CellPoint {
  readonly x: number;
  readonly y: number;
}

const MIN_CELL_PX = 0.5;
const MAX_CELL_PX = 64;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 摄像机只负责视口换算，不碰世界状态。 */
export class Camera {
  cellPx = 16;
  originX = 0;
  originY = 0;

  fit(worldWidth: number, worldHeight: number, viewportWidth: number, viewportHeight: number): void {
    const fitX = viewportWidth / worldWidth;
    const fitY = viewportHeight / worldHeight;
    this.cellPx = clamp(Math.min(fitX, fitY), MIN_CELL_PX, MAX_CELL_PX);
    this.originX = 0;
    this.originY = 0;
    this.clampOrigin(worldWidth, worldHeight, viewportWidth, viewportHeight);
  }

  clampOrigin(worldWidth: number, worldHeight: number, viewportWidth: number, viewportHeight: number): void {
    const maxX = Math.max(0, worldWidth * this.cellPx - viewportWidth);
    const maxY = Math.max(0, worldHeight * this.cellPx - viewportHeight);
    this.originX = clamp(this.originX, 0, maxX);
    this.originY = clamp(this.originY, 0, maxY);
  }

  pan(dx: number, dy: number): void {
    this.originX += dx;
    this.originY += dy;
  }

  cellAt(screenX: number, screenY: number): CellPoint {
    return {
      x: Math.floor((screenX + this.originX) / this.cellPx),
      y: Math.floor((screenY + this.originY) / this.cellPx),
    };
  }

  zoomAt(
    factor: number,
    screenX: number,
    screenY: number,
    worldWidth: number,
    worldHeight: number,
    viewportWidth: number,
    viewportHeight: number,
  ): void {
    const beforeX = (screenX + this.originX) / this.cellPx;
    const beforeY = (screenY + this.originY) / this.cellPx;
    this.cellPx = clamp(this.cellPx * factor, MIN_CELL_PX, MAX_CELL_PX);
    this.originX = beforeX * this.cellPx - screenX;
    this.originY = beforeY * this.cellPx - screenY;
    this.clampOrigin(worldWidth, worldHeight, viewportWidth, viewportHeight);
  }

  /** 只算可见的那一块，渲染不会遍历整张世界。 */
  visible(worldWidth: number, worldHeight: number, viewportWidth: number, viewportHeight: number): VisibleRect {
    const x0 = clamp(Math.floor(this.originX / this.cellPx), 0, Math.max(0, worldWidth - 1));
    const y0 = clamp(Math.floor(this.originY / this.cellPx), 0, Math.max(0, worldHeight - 1));
    const cols = Math.min(worldWidth - x0, Math.ceil(viewportWidth / this.cellPx) + 1);
    const rows = Math.min(worldHeight - y0, Math.ceil(viewportHeight / this.cellPx) + 1);
    return { x0, y0, cols: Math.max(0, cols), rows: Math.max(0, rows) };
  }
}
