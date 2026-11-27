/**
 * 全仓唯一的事件定义处。事件只做通知，订阅者不修改世界。
 * 音频、日志、成就以后都从这里接。
 */
export type GameEvent =
  | { readonly type: 'tick'; readonly tick: number }
  | { readonly type: 'command'; readonly name: string; readonly tick: number }
  | { readonly type: 'undo'; readonly tick: number }
  | { readonly type: 'error'; readonly message: string };

export type EventListener = (event: GameEvent) => void;

export class EventBus {
  private readonly listeners = new Set<EventListener>();

  on(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: GameEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
