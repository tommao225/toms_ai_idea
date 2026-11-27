import { Application, CanvasSource, Rectangle, Sprite, Texture } from 'pixi.js';
import { DEVICES } from '../devices/definitions';
import { MATERIALS } from '../world/materials';
import { FIRE_BURN_TICKS, FIRE_ID, type WorldView } from '../world/world';
import type { Camera } from './camera';

function packRgb(r: number, g: number, b: number): number {
  return (255 << 24) | (b << 16) | (g << 8) | r;
}

function rgbOf(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function packColor(hex: string, shade = 1): number {
  const [r, g, b] = rgbOf(hex);
  return packRgb(
    Math.min(255, Math.round(r * shade)),
    Math.min(255, Math.round(g * shade)),
    Math.min(255, Math.round(b * shade)),
  );
}

const HEAT_MIN = -200;
const HEAT_MAX = 1200;
const HEAT_STOPS: ReadonlyArray<readonly [number, readonly [number, number, number]]> = [
  [-200, [16, 38, 78]],
  [0, [26, 36, 48]],
  [100, [148, 54, 30]],
  [600, [255, 176, 32]],
  [1200, [255, 244, 200]],
];

function heatColorAt(temperature: number): number {
  const t = Math.min(HEAT_MAX, Math.max(HEAT_MIN, temperature));
  let lower = HEAT_STOPS[0];
  let upper = HEAT_STOPS[HEAT_STOPS.length - 1];
  for (let i = 0; i < HEAT_STOPS.length - 1; i += 1) {
    if (t >= HEAT_STOPS[i][0] && t <= HEAT_STOPS[i + 1][0]) {
      lower = HEAT_STOPS[i];
      upper = HEAT_STOPS[i + 1];
      break;
    }
  }
  const span = upper[0] - lower[0] || 1;
  const k = (t - lower[0]) / span;
  return packRgb(
    Math.round(lower[1][0] + (upper[1][0] - lower[1][0]) * k),
    Math.round(lower[1][1] + (upper[1][1] - lower[1][1]) * k),
    Math.round(lower[1][2] + (upper[1][2] - lower[1][2]) * k),
  );
}

/** 姣忔牸鐨勪寒搴︽壈鍔紝璁╁ぇ鐗囧悓鑹茬墿璐ㄤ笉鑷充簬鍍忔补婕嗘《鍊掑嚭鏉ョ殑銆?*/
const SHADE_VARIANTS = [0.9, 0.97, 1.03, 1.1];
const TOP_LIGHTEN = 1.28;
const GLOW_MIN = 320;
const GLOW_SPAN = 880;

/** 瑁呯疆鍥炬爣锛?脳5 鐐归樀锛?#' 鏈綋锛?+' 鏆楄壊杞粨銆?*/
const DEVICE_ICONS: readonly (readonly string[])[] = [
  ['..#..', '.###.', '#####', '..#..', '..#..'], // 喷口
  ['#####', '..#..', '.###.', '..#..', '#####'], // 加热器
  ['.....', '#####', '.#.#.', '#####', '.....'], // 管道
  ['.###.', '##.##', '#.#.#', '##.##', '.###.'], // 泵
  ['#...#', '##.##', '#####', '##.##', '#...#'], // 阀门
  ['.....', '.###.', '#.#.#', '.###.', '.....'], // 传感器
];

export interface HoverCell {
  readonly x: number;
  readonly y: number;
}

/**
 * L0 鐏扮洅娓叉煋锛氭妸鍙鏍肩殑鐗╄川缂栧彿鐢绘垚涓€寮犱笘鐣屽ぇ灏忕殑搴曞浘锛? * 鍐嶇敤绾圭悊鐨?frame 鍙彇鍙閭ｄ竴鍧楁斁澶с€備笘鐣屽啀澶т篃涓嶅奖鍝嶆瘡甯у紑閿€銆? *
 * 瑙嗚涓婂仛浜嗕笁浠朵簨锛氭瘡鏍间寒搴︽姈鍔ㄦ墦鏁ｉ噸澶嶆劅锛涗笂鏂规槸绌烘皵鐨勬牸瀛愭彁浜紝
 * 璁╁爢绉墿鏈夊彈鍏夐潰锛涢珮娓╂牸寰€鏆栫櫧鍋忥紝浠ｆ浛鐪熸鐨勫厜鐓у眰銆? */
export class Renderer {
  private app: Application | null = null;
  private sprite: Sprite | null = null;
  private source: CanvasSource | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private image: ImageData | null = null;
  private pixels: Uint32Array | null = null;
  private viewWidth = 0;
  private viewHeight = 0;
  private worldWidth = 0;
  private worldHeight = 0;
  private heatOverlay = false;
  private lastTick = -1;
  private lastHeatMode = false;
  private lastRect = { x0: -1, y0: -1, cols: 0, rows: 0 };
  private lastHoverX = -1;
  private lastHoverY = -1;

  private readonly shade: Uint32Array;
  private readonly shadeTop: Uint32Array;
  private readonly hoverPalette: Uint32Array;
  private readonly heatPalette: Uint32Array;
  private readonly devicePalette: Uint32Array;
  private readonly deviceOutline: Uint32Array;
  /** 鐏嫍鏄庢殫锛? 鏄皢鐔勭殑鏆楃孩锛?5 鏄鏃虹殑浜粍銆?*/
  private readonly fireFade: Uint32Array;
  /** 婧呭皠鍙湪浜х敓瀹冪殑閭ｄ竴 tick 瀛樺湪锛岃繖閲屽鐣欎袱甯э紝鐪嬪緱瑙佽惤鐐广€?*/
  private readonly splashFade: { x: number; y: number; power: number; kind: number; material: number; ttl: number }[] = [];
  /** 涓婁竴娆＄湡姝ｉ噸缁樿姳浜嗗灏戞绉掞紝缁欏紑鍙戦潰鏉跨湅銆?*/
  private redrawMs = 0;

  constructor() {
    this.shade = new Uint32Array(MATERIALS.length * SHADE_VARIANTS.length);
    this.shadeTop = new Uint32Array(MATERIALS.length * SHADE_VARIANTS.length);
    this.hoverPalette = new Uint32Array(MATERIALS.length);
    MATERIALS.forEach((def, index) => {
      this.hoverPalette[index] = packColor(def.color, 1.8);
      SHADE_VARIANTS.forEach((variant, slot) => {
        this.shade[index * 4 + slot] = packColor(def.color, variant);
        this.shadeTop[index * 4 + slot] = packColor(def.color, variant * TOP_LIGHTEN);
      });
    });

    this.heatPalette = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
      this.heatPalette[i] = heatColorAt(HEAT_MIN + (i / 255) * (HEAT_MAX - HEAT_MIN));
    }

    this.devicePalette = new Uint32Array(DEVICES.length);
    this.deviceOutline = new Uint32Array(DEVICES.length);
    DEVICES.forEach((def, index) => {
      this.devicePalette[index] = packColor(def.color);
      this.deviceOutline[index] = packColor(def.color, 0.55);
    });

    this.fireFade = new Uint32Array(16);
    for (let i = 0; i < 16; i += 1) {
      const k = i / 15;
      this.fireFade[i] = packRgb(
        Math.round(58 + (255 - 58) * k),
        Math.round(18 + (208 - 18) * k),
        Math.round(8 + (112 - 8) * k),
      );
    }
  }

  get width(): number {
    return this.app ? this.app.screen.width : 0;
  }

  get height(): number {
    return this.app ? this.app.screen.height : 0;
  }

  get canvasElement(): HTMLCanvasElement | null {
    return this.app ? (this.app.canvas as HTMLCanvasElement) : null;
  }

  get lastRedrawMs(): number {
    return this.redrawMs;
  }

  setHeatOverlay(enabled: boolean): void {
    this.heatOverlay = enabled;
  }

  async init(host: HTMLElement): Promise<void> {
    const app = new Application();
    await app.init({
      background: 0x0b0d10,
      resizeTo: host,
      antialias: false,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
      preference: 'webgl',
    });
    host.appendChild(app.canvas);

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('娴忚鍣ㄤ笉鏀寔 2D 鐢诲竷');

    this.app = app;
    this.canvas = canvas;
    this.ctx = ctx;
  }

  render(view: WorldView, camera: Camera, hover: HoverCell | null): void {
    const app = this.app;
    if (!app) return;

    this.ensureWorldBuffer(view.width, view.height);
    const sprite = this.sprite;
    if (!sprite) return;

    const rect = camera.visible(view.width, view.height, app.screen.width, app.screen.height);
    if (rect.cols <= 0 || rect.rows <= 0) return;

    this.ensureViewBuffer(rect.cols, rect.rows);
    const pixels = this.pixels;
    const image = this.image;
    if (!pixels || !image) return;

    const hoverX = hover ? hover.x : -1;
    const hoverY = hover ? hover.y : -1;
    const needsRedraw =
      view.tick !== this.lastTick ||
      this.heatOverlay !== this.lastHeatMode ||
      rect.x0 !== this.lastRect.x0 ||
      rect.y0 !== this.lastRect.y0 ||
      rect.cols !== this.lastRect.cols ||
      rect.rows !== this.lastRect.rows ||
      hoverX !== this.lastHoverX ||
      hoverY !== this.lastHoverY;

    if (needsRedraw) {
      const startedAt = performance.now();
      this.updateSplashes(view);
      this.paintCells(view, rect, pixels);
      this.paintSplashes(rect, pixels);
      this.paintDevices(view, rect, pixels);
      this.paintHover(view, rect, pixels, hover);
      this.ctx?.putImageData(image, 0, 0);
      sprite.texture.source.update();
      this.redrawMs = performance.now() - startedAt;

      this.lastTick = view.tick;
      this.lastHeatMode = this.heatOverlay;
      this.lastRect = { x0: rect.x0, y0: rect.y0, cols: rect.cols, rows: rect.rows };
      this.lastHoverX = hoverX;
      this.lastHoverY = hoverY;
    }

    sprite.x = rect.x0 * camera.cellPx - camera.originX;
    sprite.y = rect.y0 * camera.cellPx - camera.originY;
    sprite.width = rect.cols * camera.cellPx;
    sprite.height = rect.rows * camera.cellPx;
  }

  /** 鎶婃湰 tick 鏂颁骇鐢熺殑婧呭皠鎺ヨ繘琛板噺闃熷垪锛屾瘡涓暀涓夊抚銆?*/
  private updateSplashes(view: WorldView): void {
    const list = this.splashFade;
    for (let i = list.length - 1; i >= 0; i -= 1) {
      list[i].ttl -= 1;
      if (list[i].ttl <= 0) list.splice(i, 1);
    }
    for (const splash of view.splashes) {
      list.push({ x: splash.x, y: splash.y, power: splash.power, kind: splash.kind, material: splash.material, ttl: 3 });
    }
    if (list.length > 64) list.splice(0, list.length - 64);
  }

  /**
   * 婧呭皠锛氬彧鏄竴闂€岃繃鐨勫嚑涓儚绱犮€?   * 鎾炲埌鍥轰綋婧呭緱鍙堥珮鍙堟暎锛岃惤杩涙恫浣撳彧闂蜂竴涓嬶紝钀借繘绮夋湯鍑犱箮琚惛鏀躲€?   */
  private paintSplashes(rect: { x0: number; y0: number; cols: number; rows: number }, pixels: Uint32Array): void {
    const splashes = this.splashFade;
    if (splashes.length === 0) return;

    for (const splash of splashes) {
      if (splash.kind === 3) continue;
      const spread = splash.kind === 0 ? 3 : splash.kind === 1 ? 2 : 1;
      const rows = splash.kind === 0 ? 2 : 1;
      const count = Math.min(6, 2 + Math.floor(splash.power / 3));
      const color = this.shade[splash.material * 4];

      for (let i = 0; i < count; i += 1) {
        const side = i % 2 === 0 ? 1 : -1;
        const dx = side * Math.ceil((i + 1) / 2);
        if (Math.abs(dx) > spread) continue;
        const dy = -(1 + (i % rows));
        const x = splash.x + dx;
        const y = splash.y + dy;
        if (x < rect.x0 || y < rect.y0 || x >= rect.x0 + rect.cols || y >= rect.y0 + rect.rows) continue;
        pixels[(y - rect.y0) * rect.cols + (x - rect.x0)] = color;
      }
    }
  }

  /** 寮€鍙戦潰鏉跨敤锛氭姤鍛婃覆鏌撳眰鐨勫疄闄呭昂瀵革紝鍑洪棶棰樻椂绗竴鐪肩湅杩欓噷銆?*/  debugInfo(): string {
    const app = this.app;
    const sprite = this.sprite;
    if (!app || !sprite) return 'renderer 鏈垵濮嬪寲';
    return [
      `screen ${Math.round(app.screen.width)}脳${Math.round(app.screen.height)}`,
      `tex ${sprite.texture.width}脳${sprite.texture.height}`,
      `buf ${this.viewWidth}脳${this.viewHeight}`,
      `sprite ${Math.round(sprite.width)}脳${Math.round(sprite.height)}@${Math.round(sprite.x)},${Math.round(sprite.y)}`,
    ].join('  ');
  }

  private paintCells(
    view: WorldView,
    rect: { x0: number; y0: number; cols: number; rows: number },
    pixels: Uint32Array,
  ): void {
    const { cells, temperature, burnTime } = view;
    const worldWidth = view.width;
    const heat = this.heatOverlay;

    for (let row = 0; row < rect.rows; row += 1) {
      const worldY = rect.y0 + row;
      const worldRow = worldY * worldWidth;
      const base = row * rect.cols;
      for (let col = 0; col < rect.cols; col += 1) {
        const worldX = rect.x0 + col;
        const index = worldRow + worldX;

        if (heat) {
          pixels[base + col] = this.heatPalette[this.heatIndex(temperature[index])];
          continue;
        }

        const material = cells[index];

        // 鐏嫍锛氳秺鐑ц秺鏆楋紝鐪嬭捣鏉ユ槸鍦ㄩ€愭笎娑堝け
        if (material === FIRE_ID) {
          const life = Math.max(0, Math.min(15, Math.round((burnTime[index] / FIRE_BURN_TICKS) * 15)));
          pixels[base + col] = this.fireFade[life];
          continue;
        }

        const slot = (worldX * 31 + worldY * 17) & 3;
        const exposed = worldY > 0 && cells[index - worldWidth] === 0;
        let color = exposed ? this.shadeTop[material * 4 + slot] : this.shade[material * 4 + slot];

        const value = temperature[index];
        if (value > GLOW_MIN) color = blendGlow(color, value);
        pixels[base + col] = color;
      }
    }
  }

  private paintDevices(
    view: WorldView,
    rect: { x0: number; y0: number; cols: number; rows: number },
    pixels: Uint32Array,
  ): void {
    for (const device of view.devices) {
      const icon = DEVICE_ICONS[device.type];
      if (!icon) continue;
      const body = this.devicePalette[device.type];
      const outline = this.deviceOutline[device.type];
      for (let row = 0; row < icon.length; row += 1) {
        const worldY = device.y - 2 + row;
        const localY = worldY - rect.y0;
        if (localY < 0 || localY >= rect.rows) continue;
        const line = icon[row];
        for (let col = 0; col < line.length; col += 1) {
          const mark = line[col];
          if (mark === '.') continue;
          const worldX = device.x - 2 + col;
          const localX = worldX - rect.x0;
          if (localX < 0 || localX >= rect.cols) continue;
          pixels[localY * rect.cols + localX] = mark === '#' ? body : outline;
        }
      }
    }
  }

  private paintHover(
    view: WorldView,
    rect: { x0: number; y0: number; cols: number; rows: number },
    pixels: Uint32Array,
    hover: HoverCell | null,
  ): void {
    if (!hover) return;
    const localX = hover.x - rect.x0;
    const localY = hover.y - rect.y0;
    if (localX < 0 || localY < 0 || localX >= rect.cols || localY >= rect.rows) return;
    const index = localY * rect.cols + localX;
    pixels[index] = this.heatOverlay ? packRgb(255, 255, 255) : this.hoverPalette[view.materialAt(hover.x, hover.y)];
  }

  private heatIndex(temperature: number): number {
    const k = (temperature - HEAT_MIN) / (HEAT_MAX - HEAT_MIN);
    const index = Math.round(k * 255);
    if (index < 0) return 0;
    if (index > 255) return 255;
    return index;
  }

  /** 搴曞浘鎸変笘鐣屽ぇ灏忓垎閰嶄竴娆★紱涓栫晫灏哄鍙樹簡鎵嶉噸寤恒€?*/
  private ensureWorldBuffer(width: number, height: number): void {
    if (this.sprite && this.worldWidth === width && this.worldHeight === height) return;

    const app = this.app;
    const canvas = this.canvas;
    if (!app || !canvas) return;

    if (this.sprite) {
      this.sprite.destroy({ texture: true, textureSource: true });
      this.sprite = null;
    }

    canvas.width = width;
    canvas.height = height;

    const source = new CanvasSource({ resource: canvas });
    source.scaleMode = 'nearest';
    const texture = new Texture({ source });
    const sprite = new Sprite(texture);
    app.stage.addChild(sprite);

    this.sprite = sprite;
    this.source = source;
    this.worldWidth = width;
    this.worldHeight = height;
    this.viewWidth = 0;
    this.viewHeight = 0;
  }

  /** 鍙槸鎹竴鍧楀儚绱犵紦鍐插拰绾圭悊鍙栨櫙妗嗭紝涓嶅姩搴曞浘灏哄銆?*/
  private ensureViewBuffer(cols: number, rows: number): void {
    if (cols === this.viewWidth && rows === this.viewHeight) return;
    const ctx = this.ctx;
    const sprite = this.sprite;
    const source = this.source;
    if (!ctx || !sprite || !source) return;

    this.image = ctx.createImageData(cols, rows);
    this.pixels = new Uint32Array(this.image.data.buffer as ArrayBuffer);
    // 鎹竴涓彧鍙栧乏涓婅鍙鍧楃殑绾圭悊澹筹紝搴曞浘涓?GPU 璧勬簮閮戒笉閲嶅缓
    sprite.texture = new Texture({ source, frame: new Rectangle(0, 0, cols, rows) });
    this.viewWidth = cols;
    this.viewHeight = rows;
  }
}

/** 楂樻俯鏍煎線鏆栫櫧鍋忥紝椤舵浛鐪熸鐨勫厜鐓у眰銆?*/
function blendGlow(color: number, temperature: number): number {
  const k = Math.min(1, (temperature - GLOW_MIN) / GLOW_SPAN);
  const r = color & 0xff;
  const g = (color >> 8) & 0xff;
  const b = (color >> 16) & 0xff;
  return packRgb(
    Math.min(255, Math.round(r + (255 - r) * k * 0.85)),
    Math.min(255, Math.round(g + (226 - g) * k * 0.7)),
    Math.min(255, Math.round(b + (150 - b) * k * 0.45)),
  );
}
