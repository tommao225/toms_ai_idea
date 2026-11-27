/** 开发面板：只在需要时刷新文本，避免每帧改 DOM。 */
export class Hud {
  private readonly element: HTMLElement;
  private readonly intervalMs: number;
  private lastAt = 0;
  private pending = '';

  constructor(element: HTMLElement, intervalMs = 200) {
    this.element = element;
    this.intervalMs = intervalMs;
  }

  set(text: string, now: number): void {
    this.pending = text;
    if (now - this.lastAt < this.intervalMs) return;
    this.lastAt = now;
    this.element.textContent = this.pending;
  }

  clear(): void {
    this.pending = '';
    this.element.textContent = '';
  }
}
