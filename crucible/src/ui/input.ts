export interface PointerHandlers {
  /** isStart 表示这是一笔的起笔，只有起笔时需要存快照。 */
  onPaint(screenX: number, screenY: number, erase: boolean, isStart: boolean): void;
  onPan(dx: number, dy: number): void;
  onZoom(factor: number, screenX: number, screenY: number): void;
  onMove(screenX: number, screenY: number): void;
  onLeave(): void;
}

interface ClientPoint {
  readonly clientX: number;
  readonly clientY: number;
}

export function attachPointer(canvas: HTMLCanvasElement, handlers: PointerHandlers): () => void {
  let painting = false;
  let panning = false;
  let erasing = false;
  let lastX = 0;
  let lastY = 0;

  const toLocal = (event: ClientPoint): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onPointerDown = (event: PointerEvent): void => {
    const point = toLocal(event);
    if (event.button === 1 || event.button === 2) {
      panning = true;
      lastX = point.x;
      lastY = point.y;
      canvas.setPointerCapture(event.pointerId);
      return;
    }
    if (event.button !== 0) return;
    painting = true;
    erasing = event.shiftKey;
    canvas.setPointerCapture(event.pointerId);
    handlers.onPaint(point.x, point.y, erasing, true);
  };

  const onPointerMove = (event: PointerEvent): void => {
    const point = toLocal(event);
    if (painting) {
      handlers.onPaint(point.x, point.y, erasing, false);
      return;
    }
    if (panning) {
      handlers.onPan(point.x - lastX, point.y - lastY);
      lastX = point.x;
      lastY = point.y;
      return;
    }
    handlers.onMove(point.x, point.y);
  };

  const onPointerUp = (event: PointerEvent): void => {
    painting = false;
    panning = false;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };

  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const point = toLocal(event);
    handlers.onZoom(Math.pow(1.0015, -event.deltaY), point.x, point.y);
  };

  const onContextMenu = (event: Event): void => {
    event.preventDefault();
  };

  const onPointerLeave = (): void => {
    handlers.onLeave();
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerLeave);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', onContextMenu);

  return () => {
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
    canvas.removeEventListener('pointerleave', onPointerLeave);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('contextmenu', onContextMenu);
  };
}
