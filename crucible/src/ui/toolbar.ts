import { DEVICES } from '../devices/definitions';
import { MATERIALS, type MaterialDef } from '../world/materials';

export interface ToolbarHandlers {
  onSelectMaterial(materialId: number): void;
  onSelectDevice(deviceId: number): void;
  onPause(): void;
  onStep(): void;
  onSlow(): void;
  onUndo(): void;
  onClear(): void;
  onToggleHeat(): void;
  onToggleHelp(): void;
}

export class Toolbar {
  private readonly materialButtons = new Map<number, HTMLButtonElement>();
  private readonly deviceButtons = new Map<number, HTMLButtonElement>();
  private readonly actionButtons = new Map<string, HTMLButtonElement>();
  private selectedMaterialId: number;
  private selectedDeviceId = -1;

  constructor(toolbar: HTMLElement, handlers: ToolbarHandlers) {
    const materialHost = toolbar.querySelector<HTMLElement>('#materials');
    const deviceHost = toolbar.querySelector<HTMLElement>('#devices');
    if (!materialHost || !deviceHost) throw new Error('工具栏缺少物质或装置容器');

    const placeable = MATERIALS.filter((def: MaterialDef) => def.placeable);
    if (placeable.length === 0) throw new Error('没有任何可放置的物质');
    this.selectedMaterialId = placeable[0].id;

    for (const def of placeable) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.material = String(def.id);
      button.innerHTML = `<span class="swatch" style="background:${def.color}"></span>${def.name}`;
      button.addEventListener('click', () => {
        this.selectedMaterialId = def.id;
        this.selectedDeviceId = -1;
        this.syncSelection();
        handlers.onSelectMaterial(def.id);
      });
      materialHost.appendChild(button);
      this.materialButtons.set(def.id, button);
    }

    for (const def of DEVICES) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.device = String(def.id);
      button.innerHTML = `<span class="swatch" style="background:${def.color}"></span>${def.name}`;
      button.addEventListener('click', () => {
        this.selectedDeviceId = def.id;
        this.syncSelection();
        handlers.onSelectDevice(def.id);
      });
      deviceHost.appendChild(button);
      this.deviceButtons.set(def.id, button);
    }
    this.syncSelection();

    const actions: Record<string, () => void> = {
      pause: handlers.onPause,
      step: handlers.onStep,
      slow: handlers.onSlow,
      heat: handlers.onToggleHeat,
      help: handlers.onToggleHelp,
      undo: handlers.onUndo,
      clear: handlers.onClear,
    };

    for (const button of toolbar.querySelectorAll<HTMLButtonElement>('button[data-action]')) {
      const action = button.dataset.action;
      const handler = action ? actions[action] : undefined;
      if (!action || !handler) continue;
      button.addEventListener('click', handler);
      this.actionButtons.set(action, button);
    }
  }

  get selectedMaterial(): number {
    return this.selectedMaterialId;
  }

  get selectedDevice(): number {
    return this.selectedDeviceId;
  }

  get deviceMode(): boolean {
    return this.selectedDeviceId >= 0;
  }

  setPaused(paused: boolean): void {
    const button = this.actionButtons.get('pause');
    if (!button) return;
    button.setAttribute('aria-pressed', String(paused));
    button.textContent = paused ? '继续' : '暂停';
  }

  setSlow(slow: boolean): void {
    const button = this.actionButtons.get('slow');
    if (!button) return;
    button.setAttribute('aria-pressed', String(slow));
  }

  setHeatEnabled(enabled: boolean): void {
    const button = this.actionButtons.get('heat');
    if (!button) return;
    button.setAttribute('aria-pressed', String(enabled));
  }

  private syncSelection(): void {
    for (const [id, button] of this.materialButtons) {
      button.setAttribute('aria-pressed', String(this.selectedDeviceId < 0 && id === this.selectedMaterialId));
    }
    for (const [id, button] of this.deviceButtons) {
      button.setAttribute('aria-pressed', String(id === this.selectedDeviceId));
    }
  }
}
