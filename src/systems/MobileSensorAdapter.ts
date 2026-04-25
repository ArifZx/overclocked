import { MACHINE } from "../core/Constants";
import { EventBus, Events } from "../core/EventBus";
import { gameState } from "../core/GameState";
import type { MotionInputAdapter, MotionSystemHost } from "./MotionInputAdapter";

export class MobileSensorAdapter implements MotionInputAdapter {
  private readonly _host: MotionSystemHost;
  private readonly _boundOrientation: (e: DeviceOrientationEvent) => void;
  private readonly _boundMotion: (e: DeviceMotionEvent) => void;
  private _lastAccel = 0;
  private _prevBeta = 0;

  constructor(host: MotionSystemHost) {
    this._host = host;
    this._boundOrientation = this._onOrientation.bind(this);
    this._boundMotion = this._onMotion.bind(this);
  }

  start() {
    window.addEventListener("deviceorientation", this._boundOrientation);
    window.addEventListener("devicemotion", this._boundMotion);
  }

  stop() {
    window.removeEventListener("deviceorientation", this._boundOrientation);
    window.removeEventListener("devicemotion", this._boundMotion);
  }

  update(_deltaMs: number) {}

  private _onOrientation(e: DeviceOrientationEvent) {
    const gamma = e.gamma ?? 0;
    gameState.tiltAngle = gamma;

    const beta = e.beta ?? 0;
    const wasNormal = Math.abs(this._prevBeta) < MACHINE.FLIP_BETA_THRESHOLD;
    const isFlipped = Math.abs(beta) > MACHINE.FLIP_BETA_THRESHOLD;
    if (wasNormal && isFlipped) {
      this._host.triggerDesktopFlip();
    }
    this._prevBeta = beta;
  }

  private _onMotion(e: DeviceMotionEvent) {
    const accel = e.accelerationIncludingGravity;
    if (!accel) return;

    const magnitude = Math.sqrt((accel.x ?? 0) ** 2 + (accel.y ?? 0) ** 2 + (accel.z ?? 0) ** 2);
    const diff = Math.abs(magnitude - this._lastAccel);
    this._lastAccel = magnitude;

    if (diff > MACHINE.SHAKE_THRESHOLD) {
      const power = Math.min(diff - MACHINE.SHAKE_THRESHOLD, MACHINE.MAX_SHAKE_POWER * 0.3);
      gameState.shakePower = Math.min(gameState.shakePower + power, MACHINE.MAX_SHAKE_POWER);
      EventBus.emit(Events.SPECTACLE_ACTION, {
        type: "shake",
        power: gameState.shakePower,
      });
    }
  }
}
