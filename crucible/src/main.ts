import './ui/style.css';
import { Game } from './app/game';
import { deviceIdOf } from './devices/definitions';
import { Camera } from './render/camera';
import { Renderer } from './render/renderer';
import { Hud } from './ui/hud';
import { attachPointer } from './ui/input';
import { Toolbar } from './ui/toolbar';
import { MATERIALS, materialIdOf } from './world/materials';

const WORLD_WIDTH = 640;
const WORLD_HEIGHT = 384;
const BRUSH = 10;
const SEED = 20261125;

const STONE = materialIdOf('stone');
const WATER = materialIdOf('water');
const LAVA = materialIdOf('lava');
const ICE = materialIdOf('ice');
const OIL = materialIdOf('oil');

const EMITTER = deviceIdOf('emitter');
const HEATER = deviceIdOf('heater');

function must<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`页面缺少元素：${selector}`);
  return element;
}

/** 起不来的时候给人一句人话，别只留一个黑屏。 */
function showBootFailure(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  const box = document.createElement('div');
  box.id = 'boot-tip';
  box.innerHTML =
    '<div>' +
    '<p>这个 demo 需要 WebGL，当前浏览器没能启动渲染。</p>' +
    '<p>换一个桌面浏览器（Chrome、Edge、Firefox）再试一次。</p>' +
    `<p style="opacity:.55">${message}</p>` +
    '</div>';
  document.body.appendChild(box);
}

const stage = must<HTMLElement>('#stage');
const toolbarRoot = must<HTMLElement>('#toolbar');
const hudRoot = must<HTMLElement>('#hud');
const toastRoot = must<HTMLElement>('#toast');
const helpRoot = must<HTMLElement>('#help');

const game = new Game({ width: WORLD_WIDTH, height: WORLD_HEIGHT, seed: SEED });
const camera = new Camera();
const renderer = new Renderer();

try {
  await renderer.init(stage);
} catch (error) {
  showBootFailure(error);
  throw error;
}

const canvas = renderer.canvasElement;
if (!canvas) throw new Error('渲染器没有返回画布');

camera.fit(WORLD_WIDTH, WORLD_HEIGHT, renderer.width, renderer.height);

let hover: { x: number; y: number } | null = null;
let selectedMaterial = MATERIALS.find((def) => def.placeable)?.id ?? 0;
let heatOverlay = false;
let fps = 0;

const hud = new Hud(hudRoot);

const toolbar = new Toolbar(toolbarRoot, {
  onSelectMaterial(id) {
    selectedMaterial = id;
  },
  onSelectDevice() {
    // 装置的选中状态由工具栏自己维护，这里不用做事
  },
  onPause() {
    game.setPaused(!game.paused);
    toolbar.setPaused(game.paused);
  },
  onStep() {
    game.setPaused(true);
    game.stepOnce();
    toolbar.setPaused(true);
  },
  onSlow() {
    game.setSlow(!game.slow);
    toolbar.setSlow(game.slow);
  },
  onUndo() {
    game.undo();
  },
  onClear() {
    game.dispatch({ type: 'clear' });
  },
  onToggleHeat() {
    heatOverlay = !heatOverlay;
    renderer.setHeatOverlay(heatOverlay);
    toolbar.setHeatEnabled(heatOverlay);
  },
  onToggleHelp() {
    helpRoot.hidden = !helpRoot.hidden;
  },
});

must<HTMLButtonElement>('#help-close').addEventListener('click', () => {
  helpRoot.hidden = true;
});

attachPointer(canvas, {
  onPaint(screenX, screenY, erase, isStart) {
    const cell = camera.cellAt(screenX, screenY);
    if (erase) {
      // Shift + 左键：先拆掉这一格的装置（没有装置就只擦物质）
      game.dispatch({ type: 'remove-device', x: cell.x, y: cell.y }, { snapshot: isStart });
      game.dispatch({ type: 'erase', x: cell.x, y: cell.y, brush: BRUSH }, { snapshot: false });
      return;
    }
    if (toolbar.deviceMode) {
      game.dispatch(
        { type: 'place-device', device: toolbar.selectedDevice, x: cell.x, y: cell.y },
        { snapshot: isStart },
      );
      return;
    }
    game.dispatch(
      { type: 'place', x: cell.x, y: cell.y, brush: BRUSH, material: selectedMaterial },
      { snapshot: isStart },
    );
  },
  onPan(dx, dy) {
    camera.pan(dx, dy);
    camera.clampOrigin(WORLD_WIDTH, WORLD_HEIGHT, renderer.width, renderer.height);
  },
  onZoom(factor, screenX, screenY) {
    camera.zoomAt(factor, screenX, screenY, WORLD_WIDTH, WORLD_HEIGHT, renderer.width, renderer.height);
  },
  onMove(screenX, screenY) {
    hover = camera.cellAt(screenX, screenY);
  },
  onLeave() {
    hover = null;
  },
});

/** 开局摆一个场景，打开就能看到东西在动。这些命令不进撤销栈。 */
function seedScene(): void {
  const floorY = WORLD_HEIGHT - 6;
  game.dispatch({ type: 'fill', x: 0, y: floorY, width: WORLD_WIDTH, height: 6, material: STONE }, { snapshot: false });
  game.dispatch({ type: 'fill', x: 0, y: 0, width: 4, height: WORLD_HEIGHT, material: STONE }, { snapshot: false });
  game.dispatch(
    { type: 'fill', x: WORLD_WIDTH - 4, y: 0, width: 4, height: WORLD_HEIGHT, material: STONE },
    { snapshot: false },
  );

  // 两块架空石台，给画面一点纵深；左边这块特意不挡喷口的落料线
  game.dispatch({ type: 'fill', x: 60, y: 200, width: 50, height: 4, material: STONE }, { snapshot: false });
  game.dispatch({ type: 'fill', x: 300, y: 260, width: 120, height: 4, material: STONE }, { snapshot: false });
  game.dispatch({ type: 'fill', x: 60, y: 204, width: 4, height: 24, material: STONE }, { snapshot: false });
  game.dispatch({ type: 'fill', x: 300, y: 264, width: 4, height: 20, material: STONE }, { snapshot: false });

  // 一条自动链：喷口喷沙 → 落在加热器上烧成玻璃 → 堆在底部
  game.dispatch({ type: 'place-device', device: EMITTER, x: 120, y: 70 }, { snapshot: false });
  game.dispatch({ type: 'place-device', device: HEATER, x: 120, y: 300 }, { snapshot: false });

  // 熔岩池，等着上面的水团掉进去
  game.dispatch({ type: 'place', x: 430, y: floorY - 8, brush: 14, material: LAVA }, { snapshot: false });
  game.dispatch({ type: 'place', x: 430, y: 70, brush: 9, material: WATER }, { snapshot: false });
  // 冰与油
  game.dispatch({ type: 'place', x: 560, y: 90, brush: 12, material: ICE }, { snapshot: false });
  game.dispatch({ type: 'place', x: 520, y: 300, brush: 7, material: OIL }, { snapshot: false });
}

seedScene();

function formatHud(): string {
  const stats = game.stats();
  const counts = MATERIALS.filter((def) => def.id !== 0)
    .map((def) => `${def.name} ${stats.counts[def.id]}`)
    .join('   ');
  const state = game.paused ? '暂停' : game.slow ? '慢放' : '运行';
  const probe = hover
    ? `光标 ${MATERIALS[game.view.materialAt(hover.x, hover.y)].name} ${game.view.temperatureAt(hover.x, hover.y)}°C`
    : '光标 —';
  return [
    `fps ${fps.toFixed(0)}   重绘 ${renderer.lastRedrawMs.toFixed(1)}ms   tick ${stats.tick}   ${stats.ticksPerSecond} tick/s   ${state}`,
    `撤销 ${stats.undoDepth}/30   格子 ${stats.cells}   装置 ${game.world.devices.length}   ${probe}`,
    counts,
    '左键画 · Shift+左键擦 · 右键拖平移 · 滚轮缩放 · 空格暂停 · S 单步 · Ctrl+Z 撤销 · H 热视图',
  ].join('\n');
}

let errorReported = false;

function showError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(error);
  game.setPaused(true);
  toastRoot.textContent = `运行出错：${message}`;
  toastRoot.classList.add('show');
  if (!errorReported) {
    errorReported = true;
    game.bus.emit({ type: 'error', message });
  }
}

let lastFrame = performance.now();

function frame(now: number): void {
  const delta = Math.min(now - lastFrame, 250);
  lastFrame = now;
  const instant = delta > 0 ? 1000 / delta : 0;
  fps = fps === 0 ? instant : fps * 0.9 + instant * 0.1;

  try {
    game.run(delta);
    renderer.render(game.view, camera, hover);
    hud.set(formatHud(), now);
  } catch (error) {
    showError(error);
  }

  requestAnimationFrame(frame);
}

window.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    helpRoot.hidden = true;
    return;
  }
  if (event.code === 'Space') {
    event.preventDefault();
    game.setPaused(!game.paused);
    toolbar.setPaused(game.paused);
    return;
  }
  if (event.key === 's' || event.key === 'S') {
    game.setPaused(true);
    game.stepOnce();
    toolbar.setPaused(true);
    return;
  }
  if (event.key === 'h' || event.key === 'H') {
    heatOverlay = !heatOverlay;
    renderer.setHeatOverlay(heatOverlay);
    toolbar.setHeatEnabled(heatOverlay);
    return;
  }
  if ((event.ctrlKey || event.metaKey) && (event.key === 'z' || event.key === 'Z')) {
    event.preventDefault();
    game.undo();
  }
});

window.addEventListener('resize', () => {
  camera.clampOrigin(WORLD_WIDTH, WORLD_HEIGHT, renderer.width, renderer.height);
});

requestAnimationFrame(frame);
