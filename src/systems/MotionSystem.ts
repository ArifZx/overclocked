import { gameState } from "../core/GameState";
import { EventBus, Events } from "../core/EventBus";
import { MACHINE } from "../core/Constants";

type DeviceOrientationEvt = DeviceOrientationEvent & {
  requestPermission?: () => Promise<string>;
};

/**
 * Reads device gyroscope & accelerometer and writes tilt / shakePower / flipTriggered
 * into gameState. Falls back to touch-based input for when sensors are absent.
 */
export class MotionSystem {
  private _bound_orientation: (e: DeviceOrientationEvent) => void;
  private _bound_motion: (e: DeviceMotionEvent) => void;
  private _lastAccel = 0;
  private _prevBeta = 0;
  private _flipCooldown = 0;

  constructor() {
    this._bound_orientation = this._onOrientation.bind(this);
    this._bound_motion = this._onMotion.bind(this);
  }

  /** Call once to start listening. Pass the scene for Phaser time reference. */
  start() {
    if (typeof DeviceOrientationEvent === "undefined") {
      // No sensor support — use touch fallback
      gameState.motionPermission = "not_required";
      return;
    }

    const ctor = DeviceOrientationEvent as unknown as DeviceOrientationEvt;

    if (typeof ctor.requestPermission === "function") {
      // iOS 13+ — permission was already requested in Preloader; if granted, listen
      if (gameState.motionPermission === "granted") {
        this._addListeners();
      }
    } else {
      // Android / desktop — no permission needed
      gameState.motionPermission = "not_required";
      this._addListeners();
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
    EventBus.emit(Events.SPECTACLE_ACTION, { type: "tilt", angle: gameState.tiltAngle });
  }

  stop() {
    window.removeEventListener("deviceorientation", this._bound_orientation);
    window.removeEventListener("devicemotion", this._bound_motion);
  }

  private _addListeners() {
    window.addEventListener("deviceorientation", this._bound_orientation);
    window.addEventListener("devicemotion", this._bound_motion);
  }

  private _onOrientation(e: DeviceOrientationEvent) {
    // gamma: left-right tilt, -90 to 90
    const gamma = e.gamma ?? 0;
    gameState.tiltAngle = gamma;

    // Flip detection via beta (forward-back tilt)
    const beta = e.beta ?? 0;
    const wasNormal = Math.abs(this._prevBeta) < MACHINE.FLIP_BETA_THRESHOLD;
    const isFlipped = Math.abs(beta) > MACHINE.FLIP_BETA_THRESHOLD;
    if (wasNormal && isFlipped && this._flipCooldown <= 0) {
      gameState.flipTriggered = true;
      this._flipCooldown = MACHINE.FLIP_DURATION;
      EventBus.emit(Events.SPECTACLE_ACTION, { type: "flip" });
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
      EventBus.emit(Events.SPECTACLE_ACTION, { type: "shake", power: gameState.shakePower });
    }
  }
}
