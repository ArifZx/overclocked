export interface MotionInputAdapter {
  start(): void;
  stop(): void;
  update(deltaMs: number): void;
}

export interface MotionSystemHost {
  applyTouchTilt(delta: number): void;
  triggerTouchShake(): void;
  triggerDesktopFlip(): void;
}
