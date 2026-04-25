import { gameState } from "../core/GameState";
import { EventBus, Events } from "../core/EventBus";
import { MACHINE } from "../core/Constants";
import { DesktopKeyboardAdapter } from "./DesktopKeyboardAdapter";
import { MobileSensorAdapter } from "./MobileSensorAdapter";
import type { MotionInputAdapter } from "./MotionInputAdapter";

type DeviceOrientationEvt = DeviceOrientationEvent & {
  requestPermission?: () => Promise<string>;
};

/**
 * Reads device gyroscope & accelerometer and writes tilt / shakePower / flipTriggered
 * into gameState. Falls back to touch-based input for when sensors are absent.
 */
export class MotionSystem {
  private _flipCooldown = 0;
  private _adapter: MotionInputAdapter | null = null;

  /** Call once to start listening. Pass the scene for Phaser time reference. */
  start() {
    if (!gameState.hasTouch) {
      gameState.motionPermission = "not_required";
      this._adapter = new DesktopKeyboardAdapter(this);
      this._adapter.start();
      return;
    }

    if (typeof DeviceOrientationEvent === "undefined") {
      // No sensor support on touch devices — use touch fallback
      gameState.motionPermission = "not_required";
      return;
    }

    const ctor = DeviceOrientationEvent as unknown as DeviceOrientationEvt;

    if (typeof ctor.requestPermission === "function") {
      // iOS 13+ — permission was already requested in Preloader; if granted, listen
      if (gameState.motionPermission === "granted") {
        this._adapter = new MobileSensorAdapter(this);
        this._adapter.start();
      }
    } else {
      // Android mobile — no permission needed
      gameState.motionPermission = "not_required";
      this._adapter = new MobileSensorAdapter(this);
      this._adapter.start();
    }
  }

  /** Request iOS motion permission. Must be called from a user-gesture handler. */
  static async requestPermission(): Promise<boolean> {
    if (typeof DeviceOrientationEvent === "undefined") {
      gameState.motionPermission = "not_required";
      return false;
    }

    const ctor = DeviceOrientationEvent as unknown as DeviceOrientationEvt;
    if (typeof ctor.requestPermission !== "function") {
      gameState.motionPermission = "not_required";
      return true;
    }

    try {
      const result = await ctor.requestPermission();
      if (result === "granted") {
        gameState.motionPermission = "granted";
        EventBus.emit(Events.MOTION_PERMISSION_GRANTED);
        return true;
      } else {
        gameState.motionPermission = "denied";
        EventBus.emit(Events.MOTION_PERMISSION_DENIED);
        return false;
      }
    } catch {
      gameState.motionPermission = "denied";
      EventBus.emit(Events.MOTION_PERMISSION_DENIED);
      return false;
    }
  }

  /** Update per-frame — decay shake power and flip cooldown. */
  update(deltaMs: number) {
    // Decay shake power
    gameState.shakePower *= MACHINE.SHAKE_POWER_DECAY;
    if (gameState.shakePower < 0.1) gameState.shakePower = 0;

    this._adapter?.update(deltaMs);

    // Flip cooldown
    if (this._flipCooldown > 0) {
      this._flipCooldown -= deltaMs;
      if (this._flipCooldown <= 0) {
        gameState.flipTriggered = false;
      }
    }
  }

  /** Simulate a shake (called by touch button fallback). */
  triggerTouchShake() {
    gameState.shakePower = Math.min(
      gameState.shakePower + MACHINE.MAX_SHAKE_POWER * 0.35,
      MACHINE.MAX_SHAKE_POWER,
    );
    EventBus.emit(Events.SPECTACLE_ACTION, { type: "shake" });
  }

  /** Simulate tilt offset (called by touch left/right buttons). */
  applyTouchTilt(delta: number) {
    gameState.tiltAngle = Math.max(
      -MACHINE.TILT_SENSITIVITY,
      Math.min(MACHINE.TILT_SENSITIVITY, gameState.tiltAngle + delta),
    );
    EventBus.emit(Events.SPECTACLE_ACTION, {
      type: "tilt",
      angle: gameState.tiltAngle,
    });
  }

  stop() {
    this._adapter?.stop();
    this._adapter = null;
  }

  triggerDesktopFlip() {
    if (this._flipCooldown > 0) return;

    gameState.flipTriggered = true;
    this._flipCooldown = MACHINE.FLIP_DURATION;
    EventBus.emit(Events.SPECTACLE_ACTION, { type: "flip" });
  }
}
