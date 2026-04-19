import { Scene, type GameObjects } from "phaser";
import { GAME, PALETTE, UI, MACHINE, DPR, MACHINE_CONFIGS } from "../core/Constants";
import type { ChaosEventName } from "../core/Constants";
import { EventBus, Events } from "../core/EventBus";
import { gameState } from "../core/GameState";
import { MotionSystem } from "../systems/MotionSystem";
import { ChaosSystem, CHAOS_LABELS } from "../systems/ChaosSystem";

// ─── UI helper interfaces ─────────────────────────────────────────────────────
interface Bar {
  fill: GameObjects.Graphics;
  pct: GameObjects.Text;
  barY: number;
  lowColor: number;
  highColor: number;
}

interface TouchPositions {
  lx: number;
  rx: number;
  sx: number;
  ty: number;
  bh: number;
  bw: number;
  fbw: number;
  fbh: number;
}

export class Game extends Scene {
  // ── Systems ────────────────────────────────────────────────────────────────
  private _motion!: MotionSystem;
  private _chaos!: ChaosSystem;

  // ── UI objects ─────────────────────────────────────────────────────────────
  private _heatBar!: Bar;
  private _voltageBar!: Bar;
  private _pressureBar!: Bar;
  private _scoreText!: GameObjects.Text;
  private _tiltNeedle!: GameObjects.Graphics;
  private _warningText!: GameObjects.Text;
  private _chaosText!: GameObjects.Text;
  private _scanlineGfx!: GameObjects.Graphics;
  private _flashGfx!: GameObjects.Graphics;

  // ── Touch controls ─────────────────────────────────────────────────────────
  private _tcLeftBg!: GameObjects.Graphics;
  private _tcRightBg!: GameObjects.Graphics;
  private _tcShakeBg!: GameObjects.Graphics;
  private _tcPositions!: TouchPositions;
  private _drawTouchBtn!: (
    g: GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    color: number,
    alpha: number,
  ) => void;

  // ── Input state ────────────────────────────────────────────────────────────
  private _touchLeft = false;
  private _touchRight = false;
  private _touchShake = false;

  // ── Visual state ───────────────────────────────────────────────────────────
  private _scanlineY = 0;
  private _flashAlpha = 0;
  private _shakeScreenTime = 0;
  private _screenShakeMag = 0;
  private _warningFlicker = 0;

  constructor() {
    super("Game");
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────
  create() {
    gameState.reset();

    this._createBackground();
    this._createUI();
    this._createTouchControls();
    this._createFlashOverlay();

    this._motion = new MotionSystem();
    this._motion.start();

    this._chaos = new ChaosSystem();
    this._chaos.start(this.time.now);

    EventBus.on(Events.CHAOS_START, this._onChaosStart, this);
    EventBus.on(Events.CHAOS_END, this._onChaosEnd, this);
    EventBus.on(Events.MELTDOWN, this._onGameOver, this);
    EventBus.on(Events.EXPLOSION, this._onGameOver, this);

    this.events.on("shutdown", this._cleanup, this);

    EventBus.emit(Events.SPECTACLE_ENTRANCE);
    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  update(time: number, delta: number) {
    if (gameState.gameOver) return;

    const dt = delta / 1000;

    // ── Input ──────────────────────────────────────────────────────────────
    this._motion.update(delta);

    if (this._touchLeft) {
      this._motion.applyTouchTilt(-MACHINE.TILT_SENSITIVITY * 0.08);
    } else if (this._touchRight) {
      this._motion.applyTouchTilt(MACHINE.TILT_SENSITIVITY * 0.08);
    } else if (!this._hasRealGyro()) {
      gameState.tiltAngle *= 0.93;
    }

    if (this._touchShake) this._motion.triggerTouchShake();

    // ── Chaos modifiers ────────────────────────────────────────────────────
    const chaos = gameState.activeChaosEvent;
    let effectiveTilt = gameState.tiltAngle;
    if (chaos === "control_inversion") effectiveTilt = -effectiveTilt;
    if (chaos === "sensor_drift") effectiveTilt += (Math.random() - 0.5) * 30;
    if (chaos === "orientation_lock") effectiveTilt = 0;

    // ── Voltage ────────────────────────────────────────────────────────────
    const tiltFraction = Math.max(-1, Math.min(1, effectiveTilt / MACHINE.TILT_SENSITIVITY));
    const targetVoltage = 50 + tiltFraction * 50;

    if (chaos === "voltage_spike") {
      gameState.voltage = Math.min(
        MACHINE.MAX_VOLTAGE,
        gameState.voltage + Math.random() * 150 * dt,
      );
    } else {
      gameState.voltage += (targetVoltage - gameState.voltage) * Math.min(1, dt * 5);
      gameState.voltage = Math.max(
        MACHINE.MIN_VOLTAGE,
        Math.min(MACHINE.MAX_VOLTAGE, gameState.voltage),
      );
    }

    // ── Heat ───────────────────────────────────────────────────────────────
    const vol = gameState.voltage / 100;
    const heatMult = gameState.machineConfig.heatMult;

    let dHeat = vol * MACHINE.HEAT_RATE * heatMult * dt * 100;
    dHeat -= MACHINE.PASSIVE_COOLING * dt;

    let effectiveShake = gameState.shakePower;
    if (chaos === "fan_jam") effectiveShake = 0;
    if (chaos === "phantom_shake") effectiveShake += Math.random() * 15;
    dHeat -= effectiveShake * MACHINE.SHAKE_COOLING_RATE * dt;

    if (gameState.shakePower > MACHINE.SHAKE_INSTABILITY_THRESHOLD) {
      dHeat += MACHINE.SHAKE_HEAT_PENALTY * dt * 10;
    }
    gameState.heat = Math.max(0, Math.min(MACHINE.MAX_HEAT, gameState.heat + dHeat));

    // ── Pressure ───────────────────────────────────────────────────────────
    const pRate =
      MACHINE.PRESSURE_MIN + Math.random() * (MACHINE.PRESSURE_MAX - MACHINE.PRESSURE_MIN);
    gameState.pressure += pRate * dt;

    if (gameState.flipTriggered) {
      this._applyFlipEffect();
      gameState.flipTriggered = false;
    }
    gameState.pressure = Math.max(0, Math.min(MACHINE.MAX_PRESSURE, gameState.pressure));

    // ── Score ──────────────────────────────────────────────────────────────
    gameState.score += vol * gameState.machineConfig.scoreMult * dt * 10;

    // ── Chaos tick ─────────────────────────────────────────────────────────
    this._chaos.update(time);

    // ── Game over ──────────────────────────────────────────────────────────
    if (gameState.heat >= MACHINE.MAX_HEAT) {
      gameState.deathReason = "meltdown";
      gameState.gameOver = true;
      EventBus.emit(Events.MELTDOWN);
    } else if (gameState.pressure >= MACHINE.MAX_PRESSURE) {
      gameState.deathReason = "explosion";
      gameState.gameOver = true;
      EventBus.emit(Events.EXPLOSION);
    }

    if (gameState.heatPct() > 0.8 || gameState.pressurePct() > 0.8) {
      EventBus.emit(Events.SPECTACLE_NEAR_MISS, {
        heat: gameState.heatPct(),
        pressure: gameState.pressurePct(),
      });
    }

    // ── Render ─────────────────────────────────────────────────────────────
    this._updateBars();
    this._updateTiltIndicator(tiltFraction);
    this._updateScoreText();
    this._updateWarning();
    this._updateScanline(delta);
    this._updateScreenShake(delta);
    this._updateFlash(delta);
    this._updateTouchVisuals();
  }

  // ─── Game mechanics ───────────────────────────────────────────────────────
  private _applyFlipEffect() {
    if (Math.random() < 0.5) {
      gameState.pressure = Math.max(0, gameState.pressure * 0.3);
      this._showWarning("🔄 PRESSURE VENTED!", PALETTE.PRESSURE);
    } else {
      gameState.heat = Math.min(MACHINE.MAX_HEAT, gameState.heat + 15);
      this._showWarning("🔄 THERMAL SPIKE!", PALETTE.HEAT);
    }
    this._triggerFlash(0.6, PALETTE.VOLTAGE);
    EventBus.emit(Events.SPECTACLE_ACTION, { type: "flip" });
  }

  // ─── EventBus handlers ────────────────────────────────────────────────────
  private _onChaosStart(data: { event: ChaosEventName }) {
    this._chaosText.setText(`⚠ ${CHAOS_LABELS[data.event]}`);
    this._chaosText.setAlpha(1);
    this._triggerFlash(0.4, PALETTE.WARNING);
    this._triggerScreenShake(400, 4 * DPR);
    EventBus.emit(Events.SPECTACLE_HIT, { type: "chaos" });
  }

  private _onChaosEnd(_data: { event: ChaosEventName }) {
    this.tweens.add({ targets: this._chaosText, alpha: 0, duration: 500 });
  }

  private _onGameOver() {
    if (gameState.score > gameState.bestScore) {
      gameState.bestScore = Math.floor(gameState.score);
    }
    const color = gameState.deathReason === "meltdown" ? PALETTE.HEAT : PALETTE.PRESSURE;
    this._triggerFlash(1.0, color);
    this._triggerScreenShake(600, 12 * DPR);
    this.time.delayedCall(900, () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.start("GameOver");
      });
    });
  }

  // ─── UI creation ──────────────────────────────────────────────────────────
  private _createBackground() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(PALETTE.BG, PALETTE.BG, PALETTE.PANEL, PALETTE.PANEL, 1);
    bg.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
    bg.setDepth(-10);

    const grid = this.add.graphics();
    grid.lineStyle(1, PALETTE.GRID, 0.35);
    const sp = 36 * DPR;
    for (let x = 0; x < GAME.WIDTH; x += sp) grid.lineBetween(x, 0, x, GAME.HEIGHT);
    for (let y = 0; y < GAME.HEIGHT; y += sp) grid.lineBetween(0, y, GAME.WIDTH, y);
    grid.setDepth(-9);

    this._scanlineGfx = this.add.graphics();
    this._scanlineGfx.fillStyle(PALETTE.VOLTAGE, 0.04);
    this._scanlineGfx.fillRect(0, 0, GAME.WIDTH, 2 * DPR);
    this._scanlineGfx.setDepth(100);
  }

  private _createUI() {
    const cx = GAME.WIDTH / 2;
    const st = UI.SAFE_TOP;
    const uh = UI.USABLE_H;

    this._scoreText = this.add
      .text(cx, st + uh * UI.SCORE_Y_FRAC, "000000", {
        fontSize: UI.SCORE_FS,
        fontFamily: "monospace",
        color: PALETTE.TEXT,
        align: "center",
      })
      .setOrigin(0.5, 0.5);

    this.add
      .text(cx, st + uh * UI.MACHINE_Y_FRAC, MACHINE_CONFIGS[gameState.machineType].label, {
        fontSize: UI.MACHINE_FS,
        fontFamily: "monospace",
        color: PALETTE.TEXT_DIM,
        align: "center",
      })
      .setOrigin(0.5, 0.5);

    this._heatBar = this._makeBar(
      st + uh * UI.HEAT_Y_FRAC,
      "🔥 HEAT",
      PALETTE.HEAT_MID,
      PALETTE.HEAT,
    );
    this._voltageBar = this._makeBar(
      st + uh * UI.VOLTAGE_Y_FRAC,
      "⚡ VOLTAGE",
      PALETTE.VOLTAGE_LOW,
      PALETTE.VOLTAGE,
    );
    this._pressureBar = this._makeBar(
      st + uh * UI.PRESSURE_Y_FRAC,
      "💨 PRESSURE",
      PALETTE.PRESSURE,
      PALETTE.PRESSURE_HIGH,
    );

    this._createTiltTrack();

    this._warningText = this.add
      .text(cx, st + uh * UI.WARNING_Y_FRAC, "", {
        fontSize: UI.WARNING_FS,
        fontFamily: "monospace",
        color: "#ff3333",
        align: "center",
        stroke: "#000000",
        strokeThickness: 2 * DPR,
      })
      .setOrigin(0.5, 0.5)
      .setAlpha(0);

    this._chaosText = this.add
      .text(cx, st + uh * UI.WARNING_Y_FRAC + 30 * DPR, "", {
        fontSize: UI.CHAOS_FS,
        fontFamily: "monospace",
        color: "#ffcc00",
        align: "center",
      })
      .setOrigin(0.5, 0.5)
      .setAlpha(0);
  }

  private _makeBar(y: number, label: string, lowColor: number, highColor: number): Bar {
    const { BAR_X: bx, BAR_W: bw, BAR_H: bh, BAR_CORNER, LABEL_FS, VALUE_FS } = UI;
    const labelH = 18 * DPR;

    this.add
      .text(bx, y - labelH * 0.8, label, {
        fontSize: LABEL_FS,
        fontFamily: "monospace",
        color: PALETTE.TEXT_DIM,
      })
      .setOrigin(0, 0.5);

    const pctText = this.add
      .text(bx + bw, y - labelH * 0.8, "", {
        fontSize: VALUE_FS,
        fontFamily: "monospace",
        color: PALETTE.TEXT_DIM,
      })
      .setOrigin(1, 0.5);

    const bg = this.add.graphics();
    bg.fillStyle(PALETTE.BAR_BG, 1);
    bg.fillRoundedRect(bx, y, bw, bh, BAR_CORNER);
    bg.lineStyle(1, PALETTE.PANEL_BORDER, 0.8);
    bg.strokeRoundedRect(bx, y, bw, bh, BAR_CORNER);

    const fill = this.add.graphics();
    return { fill, pct: pctText, barY: y, lowColor, highColor };
  }

  private _createTiltTrack() {
    const cx = GAME.WIDTH / 2;
    const ty = UI.SAFE_TOP + UI.USABLE_H * UI.TILT_Y_FRAC;
    const tw = UI.TILT_W;
    const th = UI.TILT_H;
    const tx = cx - tw / 2;

    const track = this.add.graphics();
    track.fillStyle(PALETTE.BAR_BG, 1);
    track.fillRoundedRect(tx, ty, tw, th, UI.BAR_CORNER);
    track.lineStyle(1, PALETTE.VOLTAGE, 0.4);
    track.strokeRoundedRect(tx, ty, tw, th, UI.BAR_CORNER);
    track.lineStyle(1, PALETTE.TEXT_DIM_HEX, 0.5);
    track.lineBetween(cx, ty - 4 * DPR, cx, ty + th + 4 * DPR);

    this.add
      .text(tx - 6 * DPR, ty + th / 2, "◄", {
        fontSize: UI.VALUE_FS,
        fontFamily: "monospace",
        color: PALETTE.TEXT_DIM,
      })
      .setOrigin(1, 0.5);
    this.add
      .text(tx + tw + 6 * DPR, ty + th / 2, "►", {
        fontSize: UI.VALUE_FS,
        fontFamily: "monospace",
        color: PALETTE.TEXT_DIM,
      })
      .setOrigin(0, 0.5);

    this._tiltNeedle = this.add.graphics();
  }

  private _createTouchControls() {
    const cx = GAME.WIDTH / 2;
    const ty = UI.SAFE_TOP + UI.USABLE_H * UI.TOUCH_Y_FRAC;
    const bw = UI.TOUCH_BTN_W;
    const bh = UI.TOUCH_BTN_H;
    const fbw = UI.FLIP_BTN_W;
    const fbh = UI.FLIP_BTN_H;

    const drawBtn = (
      g: GameObjects.Graphics,
      x: number,
      y: number,
      w: number,
      h: number,
      color: number,
      alpha: number,
    ) => {
      g.clear();
      g.fillStyle(color, alpha);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8 * DPR);
    };

    this._tcLeftBg = this.add.graphics();
    this._tcRightBg = this.add.graphics();
    this._tcShakeBg = this.add.graphics();

    drawBtn(this._tcLeftBg, cx - bw * 1.2, ty, bw, bh, PALETTE.VOLTAGE, UI.TOUCH_ALPHA);
    drawBtn(this._tcRightBg, cx + bw * 1.2, ty, bw, bh, PALETTE.VOLTAGE, UI.TOUCH_ALPHA);
    drawBtn(this._tcShakeBg, cx, ty + bh, fbw, fbh, PALETTE.HEAT, UI.TOUCH_ALPHA);

    this.add
      .text(cx - bw * 1.2, ty, "◄ TILT", {
        fontSize: UI.VALUE_FS,
        fontFamily: "monospace",
        color: "#0a0a14",
      })
      .setOrigin(0.5, 0.5);
    this.add
      .text(cx + bw * 1.2, ty, "TILT ►", {
        fontSize: UI.VALUE_FS,
        fontFamily: "monospace",
        color: "#0a0a14",
      })
      .setOrigin(0.5, 0.5);
    this.add
      .text(cx, ty + bh, "📳 SHAKE", {
        fontSize: UI.VALUE_FS,
        fontFamily: "monospace",
        color: "#0a0a14",
      })
      .setOrigin(0.5, 0.5);

    const lz = this.add.zone(cx - bw * 1.2, ty, bw, bh).setInteractive();
    lz.on("pointerdown", () => {
      this._touchLeft = true;
    });
    lz.on("pointerup", () => {
      this._touchLeft = false;
    });
    lz.on("pointerout", () => {
      this._touchLeft = false;
    });

    const rz = this.add.zone(cx + bw * 1.2, ty, bw, bh).setInteractive();
    rz.on("pointerdown", () => {
      this._touchRight = true;
    });
    rz.on("pointerup", () => {
      this._touchRight = false;
    });
    rz.on("pointerout", () => {
      this._touchRight = false;
    });

    const sz = this.add.zone(cx, ty + bh, fbw, fbh).setInteractive();
    sz.on("pointerdown", () => {
      this._touchShake = true;
    });
    sz.on("pointerup", () => {
      this._touchShake = false;
    });
    sz.on("pointerout", () => {
      this._touchShake = false;
    });

    this._drawTouchBtn = drawBtn;
    this._tcPositions = { lx: cx - bw * 1.2, rx: cx + bw * 1.2, sx: cx, ty, bh, bw, fbw, fbh };
  }

  private _createFlashOverlay() {
    this._flashGfx = this.add.graphics().setDepth(200).setAlpha(0);
  }

  // ─── Per-frame render helpers ─────────────────────────────────────────────
  private _updateBars() {
    const { BAR_X: bx, BAR_W: bw, BAR_H: bh, BAR_CORNER } = UI;
    const all: Array<{ bar: Bar; pct: number }> = [
      { bar: this._heatBar, pct: gameState.heatPct() },
      { bar: this._voltageBar, pct: gameState.voltagePct() },
      { bar: this._pressureBar, pct: gameState.pressurePct() },
    ];

    for (const { bar, pct } of all) {
      const color = pct > 0.75 ? bar.highColor : bar.lowColor;
      bar.fill.clear();
      if (pct > 0) {
        bar.fill.fillStyle(color, pct > 0.9 ? 0.95 : 0.85);
        bar.fill.fillRoundedRect(bx, bar.barY, bw * pct, bh, BAR_CORNER);
        if (pct > 0.75) {
          bar.fill.lineStyle(1, color, 0.5);
          bar.fill.strokeRoundedRect(bx, bar.barY, bw * pct, bh, BAR_CORNER);
        }
      }
      bar.pct.setText(`${Math.round(pct * 100)}%`);
      bar.pct.setColor(pct > 0.75 ? "#ff4444" : PALETTE.TEXT_DIM);
    }
  }

  private _updateTiltIndicator(tiltFraction: number) {
    const cx = GAME.WIDTH / 2;
    const ty = UI.SAFE_TOP + UI.USABLE_H * UI.TILT_Y_FRAC;
    const tw = UI.TILT_W;
    const th = UI.TILT_H;
    const nx = cx + tiltFraction * (tw / 2 - 6 * DPR);
    const nh = th * 1.4;

    this._tiltNeedle.clear();
    this._tiltNeedle.fillStyle(PALETTE.VOLTAGE, 0.9);
    this._tiltNeedle.fillRect(nx - 3 * DPR, ty + (th - nh) / 2, 6 * DPR, nh);
  }

  private _updateScoreText() {
    this._scoreText.setText(Math.floor(gameState.score).toString().padStart(6, "0"));
  }

  private _updateWarning() {
    this._warningFlicker++;
    const heatCrit = gameState.heatPct() > 0.85;
    const presCrit = gameState.pressurePct() > 0.85;

    if (heatCrit || presCrit) {
      this._warningText.setText(heatCrit ? "⚠ MELTDOWN IMMINENT ⚠" : "⚠ PRESSURE CRITICAL ⚠");
      this._warningText.setAlpha(this._warningFlicker % 30 < 15 ? 1 : 0);
    } else if (gameState.activeChaosEvent === null && this._warningText.alpha > 0) {
      this._warningText.setAlpha(Math.max(0, this._warningText.alpha - 0.05));
    }
  }

  private _updateScanline(delta: number) {
    this._scanlineY += delta * 0.15;
    if (this._scanlineY > GAME.HEIGHT) this._scanlineY = 0;
    this._scanlineGfx.setY(this._scanlineY);
  }

  private _triggerScreenShake(durationMs: number, magnitude: number) {
    this._shakeScreenTime = durationMs;
    this._screenShakeMag = magnitude;
  }

  private _updateScreenShake(delta: number) {
    if (this._shakeScreenTime <= 0) {
      this.cameras.main.setScroll(0, 0);
      return;
    }
    this._shakeScreenTime -= delta;
    const strength = (Math.max(0, this._shakeScreenTime) / 1000) * this._screenShakeMag;
    this.cameras.main.setScroll((Math.random() - 0.5) * strength, (Math.random() - 0.5) * strength);
    if (this._shakeScreenTime <= 0) this.cameras.main.setScroll(0, 0);
  }

  private _triggerFlash(alpha: number, color: number) {
    this._flashGfx.clear();
    this._flashGfx.fillStyle(color, 1);
    this._flashGfx.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
    this._flashAlpha = alpha;
    this._flashGfx.setAlpha(alpha);
  }

  private _updateFlash(delta: number) {
    if (this._flashAlpha <= 0) return;
    this._flashAlpha = Math.max(0, this._flashAlpha - delta * 0.003);
    this._flashGfx.setAlpha(this._flashAlpha);
  }

  private _showWarning(text: string, color: number) {
    this._warningText.setText(text);
    this._warningText.setColor(`#${color.toString(16).padStart(6, "0")}`);
    this._warningText.setAlpha(1);
  }

  private _updateTouchVisuals() {
    const p = this._tcPositions;
    this._drawTouchBtn(
      this._tcLeftBg,
      p.lx,
      p.ty,
      p.bw,
      p.bh,
      PALETTE.VOLTAGE,
      this._touchLeft ? UI.TOUCH_ACTIVE_ALPHA : UI.TOUCH_ALPHA,
    );
    this._drawTouchBtn(
      this._tcRightBg,
      p.rx,
      p.ty,
      p.bw,
      p.bh,
      PALETTE.VOLTAGE,
      this._touchRight ? UI.TOUCH_ACTIVE_ALPHA : UI.TOUCH_ALPHA,
    );
    this._drawTouchBtn(
      this._tcShakeBg,
      p.sx,
      p.ty + p.bh,
      p.fbw,
      p.fbh,
      PALETTE.HEAT,
      this._touchShake ? UI.TOUCH_ACTIVE_ALPHA : UI.TOUCH_ALPHA,
    );
  }

  private _hasRealGyro(): boolean {
    return (
      gameState.motionPermission === "granted" || gameState.motionPermission === "not_required"
    );
  }

  private _cleanup() {
    this._motion.stop();
    EventBus.off(Events.CHAOS_START, this._onChaosStart, this);
    EventBus.off(Events.CHAOS_END, this._onChaosEnd, this);
    EventBus.off(Events.MELTDOWN, this._onGameOver, this);
    EventBus.off(Events.EXPLOSION, this._onGameOver, this);
  }
}
