import { MACHINE } from "../core/Constants";
import type { MotionInputAdapter, MotionSystemHost } from "./MotionInputAdapter";

export class DesktopKeyboardAdapter implements MotionInputAdapter {
  private readonly _host: MotionSystemHost;
  private _keyboardLeft = false;
  private _keyboardRight = false;
  private readonly _boundKeyDown: (e: KeyboardEvent) => void;
  private readonly _boundKeyUp: (e: KeyboardEvent) => void;

  constructor(host: MotionSystemHost) {
    this._host = host;
    this._boundKeyDown = this._onKeyDown.bind(this);
    this._boundKeyUp = this._onKeyUp.bind(this);
  }

  start() {
    window.addEventListener("keydown", this._boundKeyDown);
    window.addEventListener("keyup", this._boundKeyUp);
  }

  stop() {
    window.removeEventListener("keydown", this._boundKeyDown);
    window.removeEventListener("keyup", this._boundKeyUp);
    this._keyboardLeft = false;
    this._keyboardRight = false;
  }

  update(_deltaMs: number) {
    if (this._keyboardLeft) {
      this._host.applyTouchTilt(-MACHINE.KEYBOARD_TILT_STEP);
    } else if (this._keyboardRight) {
      this._host.applyTouchTilt(MACHINE.KEYBOARD_TILT_STEP);
    }
  }

  private _onKeyDown(e: KeyboardEvent) {
    if (e.repeat) return;

    if (e.code === "ArrowLeft") {
      this._keyboardLeft = true;
      e.preventDefault();
      return;
    }

    if (e.code === "ArrowRight") {
      this._keyboardRight = true;
      e.preventDefault();
      return;
    }

    if (e.code === "Space") {
      this._host.triggerTouchShake();
      e.preventDefault();
      return;
    }

    if (e.code === "ArrowUp" || e.code === "KeyF") {
      this._host.triggerDesktopFlip();
      e.preventDefault();
    }
  }

  private _onKeyUp(e: KeyboardEvent) {
    if (e.code === "ArrowLeft") {
      this._keyboardLeft = false;
      e.preventDefault();
      return;
    }

    if (e.code === "ArrowRight") {
      this._keyboardRight = false;
      e.preventDefault();
    }
  }
}
