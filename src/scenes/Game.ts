import { Scene, type GameObjects, type Time } from "phaser";
import { GAME, PALETTE, UI, MACHINE, DPR, MACHINE_CONFIGS, MACHINE_COMMS } from "../core/Constants";
import type { ChaosEventName, MachineCommSignal } from "../core/Constants";
import { EventBus, Events } from "../core/EventBus";
import { gameState } from "../core/GameState";
import { MotionSystem } from "../systems/MotionSystem";
import { MachineMusicSystem } from "../systems/MachineMusicSystem";
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

type AttackRequirement = "shake" | "flip" | "tilt_left" | "tilt_right" | "hold";

export class Game extends Scene {
  // ── Systems ────────────────────────────────────────────────────────────────
  private _motion!: MotionSystem;
  private _chaos!: ChaosSystem;
  private _music!: MachineMusicSystem;

  // ── UI objects ─────────────────────────────────────────────────────────────
  private _heatBar!: Bar;
  private _voltageBar!: Bar;
  private _pressureBar!: Bar;
  private _scoreText!: GameObjects.Text;
  private _commsText!: GameObjects.Text;
  private _tiltNeedle!: GameObjects.Graphics;
  private _warningText!: GameObjects.Text;
  private _chaosText!: GameObjects.Text;
  private _attackText!: GameObjects.Text;
  private _attackTimerText!: GameObjects.Text;
  private _comboText!: GameObjects.Text;
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
  private _lastShakePower = 0;

  // ── Attack state ───────────────────────────────────────────────────────────
  private _attackResolved = false;
  private _attackRequirement: AttackRequirement | null = null;
  private _tiltTargetDir: -1 | 1 = 1;
  private readonly _commPulseEvents = new Set<Time.TimerEvent>();

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

    this._music = new MachineMusicSystem(this);
    this._motion = new MotionSystem();
    this._motion.start();

    this._chaos = new ChaosSystem();
    this._chaos.start(this.time.now);

    EventBus.on(Events.CHAOS_START, this._onChaosStart, this);
    EventBus.on(Events.CHAOS_END, this._onChaosEnd, this);
    EventBus.on(Events.MELTDOWN, this._onGameOver, this);
    EventBus.on(Events.EXPLOSION, this._onGameOver, this);

    this.events.on("shutdown", this._cleanup, this);

    this._music.start("game");
    this._bootMachineComms();
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

    // ── Voltage ────────────────────────────────────────────────────────────
    const tiltFraction = Math.max(-1, Math.min(1, effectiveTilt / MACHINE.TILT_SENSITIVITY));
    const targetVoltage = 50 + tiltFraction * 50;

    gameState.voltage += (targetVoltage - gameState.voltage) * Math.min(1, dt * 5);
    gameState.voltage = Math.max(
      MACHINE.MIN_VOLTAGE,
      Math.min(MACHINE.MAX_VOLTAGE, gameState.voltage),
    );

    // ── Heat ───────────────────────────────────────────────────────────────
    const vol = gameState.voltage / 100;
    const heatMult = gameState.machineConfig.heatMult;

    let dHeat = vol * MACHINE.HEAT_RATE * heatMult * dt * 100;
    dHeat -= MACHINE.PASSIVE_COOLING * dt;

    const effectiveShake = gameState.shakePower;
    dHeat -= effectiveShake * MACHINE.SHAKE_COOLING_RATE * dt;

    if (gameState.shakePower > MACHINE.SHAKE_INSTABILITY_THRESHOLD) {
      dHeat += MACHINE.SHAKE_HEAT_PENALTY * dt * 10;
    }
    gameState.heat = Math.max(0, Math.min(MACHINE.MAX_HEAT, gameState.heat + dHeat));

    // ── Pressure ───────────────────────────────────────────────────────────
    const pressureBaseGain =
      MACHINE.PRESSURE_MIN + Math.random() * (MACHINE.PRESSURE_MAX - MACHINE.PRESSURE_MIN);
    const safeTilt = Math.max(0, -tiltFraction);
    const riskyTilt = Math.max(0, tiltFraction);
    const pressureGain =
      pressureBaseGain + (vol * 0.65 + riskyTilt * 0.35) * MACHINE.PRESSURE_RISK_GAIN;
    const pressureVent =
      MACHINE.PRESSURE_PASSIVE_VENT + safeTilt * MACHINE.PRESSURE_SAFE_VENT_BONUS;

    gameState.pressure += (pressureGain - pressureVent) * dt;

    gameState.pressure = Math.max(0, Math.min(MACHINE.MAX_PRESSURE, gameState.pressure));

    // ── Score ──────────────────────────────────────────────────────────────
    gameState.score += vol * gameState.machineConfig.scoreMult * dt * 10;

    // ── Chaos tick ─────────────────────────────────────────────────────────
    this._chaos.update(time);

    // ── Attack resolution loop ─────────────────────────────────────────────
    const shakeBurst = gameState.shakePower - this._lastShakePower > 7;
    const flipTriggered = gameState.flipTriggered;
    const panicInput = shakeBurst || flipTriggered || Math.abs(tiltFraction) > 0.78;
    this._resolveAttackWindow(time, tiltFraction, shakeBurst, flipTriggered, panicInput);

    this._lastShakePower = gameState.shakePower;
    gameState.flipTriggered = false;

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
    this._updateAttackHud(time);
    this._updateScanline(delta);
    this._updateScreenShake(delta);
    this._updateFlash(delta);
    this._updateTouchVisuals();
  }

  // ─── EventBus handlers ────────────────────────────────────────────────────
  private _onChaosStart = (data: { event: ChaosEventName }) => {
    this._attackResolved = false;
    this._chaosText.setText(`⚠ ${CHAOS_LABELS[data.event]}`);
    this._chaosText.setAlpha(1);
    this._attackRequirement = this._pickRequirement(data.event);
    this._attackText.setText(this._promptForRequirement(this._attackRequirement));
    this._attackText.setAlpha(1);
    this._attackTimerText.setAlpha(1);
    this._playCommSignal(MACHINE_COMMS.EVENTS[data.event]);
    this._triggerFlash(0.4, PALETTE.WARNING);
    this._triggerScreenShake(400, 4 * DPR);
    EventBus.emit(Events.SPECTACLE_HIT, { type: "chaos" });
  };

  private _onChaosEnd = (data: { event: ChaosEventName }) => {
    if (!this._attackResolved) {
      this._handleAttackFail(data.event, "timeout");
    }
    this._attackRequirement = null;
    this.tweens.add({ targets: this._chaosText, alpha: 0, duration: 500 });
    this.tweens.add({ targets: this._attackText, alpha: 0, duration: 350 });
    this.tweens.add({
      targets: this._attackTimerText,
      alpha: 0,
      duration: 350,
    });
    this._queueIdleComm(320);
  };

  private _onGameOver = () => {
    if (gameState.score > gameState.bestScore) {
      gameState.bestScore = Math.floor(gameState.score);
    }
    const color = gameState.deathReason === "meltdown" ? PALETTE.HEAT : PALETTE.PRESSURE;
    this._playCommSignal(MACHINE_COMMS.GAME_OVER[gameState.deathReason ?? "meltdown"]);
    this._triggerFlash(1.0, color);
    this._triggerScreenShake(600, 12 * DPR);
    this.time.delayedCall(900, () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.start("GameOver");
      });
    });
  };

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

    this._comboText = this.add
      .text(cx, st + uh * (UI.MACHINE_Y_FRAC + 0.045), "COMBO x0", {
        fontSize: UI.VALUE_FS,
        fontFamily: "monospace",
        color: "#ffcc00",
        align: "center",
      })
      .setOrigin(0.5, 0.5)
      .setAlpha(0.8);

    this.add
      .text(cx, st + uh * (UI.MACHINE_Y_FRAC + 0.095), "SYS:// AUDIO ENCODER", {
        fontSize: UI.VALUE_FS,
        fontFamily: "monospace",
        color: PALETTE.TEXT_DIM,
        align: "center",
      })
      .setOrigin(0.5, 0.5)
      .setAlpha(0.75);

    this._commsText = this.add
      .text(cx, st + uh * (UI.MACHINE_Y_FRAC + 0.13), MACHINE_COMMS.IDLE_TEXT, {
        fontSize: UI.VALUE_FS,
        fontFamily: "monospace",
        color: MACHINE_COMMS.IDLE_COLOR,
        align: "center",
      })
      .setOrigin(0.5, 0.5)
      .setAlpha(0.95);

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

    this._attackText = this.add
      .text(cx, st + uh * (UI.WARNING_Y_FRAC + 0.06), "", {
        fontSize: UI.CHAOS_FS,
        fontFamily: "monospace",
        color: PALETTE.TEXT,
        align: "center",
      })
      .setOrigin(0.5, 0.5)
      .setAlpha(0);

    this._attackTimerText = this.add
      .text(cx, st + uh * (UI.WARNING_Y_FRAC + 0.1), "", {
        fontSize: UI.VALUE_FS,
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
    this._tcPositions = {
      lx: cx - bw * 1.2,
      rx: cx + bw * 1.2,
      sx: cx,
      ty,
      bh,
      bw,
      fbw,
      fbh,
    };
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
    this._comboText.setText(`COMBO x${gameState.combo}`);
    this._comboText.setAlpha(gameState.combo > 1 ? 1 : 0.75);
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

  private _updateAttackHud(nowMs: number) {
    if (gameState.activeChaosEvent === null || this._attackResolved) return;

    const remaining = Math.max(0, gameState.chaosEndTime - nowMs);
    const sec = (remaining / 1000).toFixed(1);
    this._attackTimerText.setText(`RESPOND ${sec}s`);
    this._attackTimerText.setColor(remaining < 900 ? "#ff4444" : "#ffcc00");
  }

  private _pickRequirement(event: ChaosEventName): AttackRequirement {
    if (event === "heat_burst") return "shake";
    if (event === "pressure_crash") return "flip";
    if (event === "phantom_alert") return "hold";

    this._tiltTargetDir = Math.random() < 0.5 ? -1 : 1;
    return this._tiltTargetDir === -1 ? "tilt_left" : "tilt_right";
  }

  private _promptForRequirement(req: AttackRequirement): string {
    if (req === "shake") return "SHAKE FAST NOW";
    if (req === "flip") return "FLIP YOUR PHONE";
    if (req === "tilt_left") return "TILT LEFT HARD";
    if (req === "tilt_right") return "TILT RIGHT HARD";
    return "DO NOTHING - HOLD STEADY";
  }

  private _resolveAttackWindow(
    nowMs: number,
    tiltFraction: number,
    shakeBurst: boolean,
    flipTriggered: boolean,
    panicInput: boolean,
  ) {
    const event = gameState.activeChaosEvent;
    if (event === null || this._attackResolved || this._attackRequirement === null) return;

    const req = this._attackRequirement;

    if (req === "hold") {
      if (panicInput) {
        this._handleAttackFail(event, "baited");
      }
      return;
    }

    let success = false;
    if (req === "shake" && shakeBurst) success = true;
    if (req === "flip" && flipTriggered) success = true;
    if (req === "tilt_left" && tiltFraction < -0.55) success = true;
    if (req === "tilt_right" && tiltFraction > 0.55) success = true;

    if (!success) return;

    this._attackResolved = true;
    gameState.combo += 1;
    gameState.bestCombo = Math.max(gameState.bestCombo, gameState.combo);

    const comboBonus = 30 + gameState.combo * 12;
    gameState.score += comboBonus;

    if (event === "heat_burst") {
      gameState.heat = Math.max(0, gameState.heat - 16);
    } else if (event === "pressure_crash") {
      gameState.pressure = Math.max(0, gameState.pressure - 22);
    } else {
      gameState.voltage = Math.min(MACHINE.MAX_VOLTAGE, gameState.voltage + 12);
    }

    this._showWarning(`+${comboBonus} REACTION BONUS!`, PALETTE.VOLTAGE);
    this._triggerFlash(0.35, PALETTE.VOLTAGE);
    this._playCommSignal(MACHINE_COMMS.SUCCESS);
    EventBus.emit(Events.SPECTACLE_HIT, {
      type: "attack_success",
      event,
      combo: gameState.combo,
    });
    EventBus.emit(Events.SPECTACLE_COMBO, { combo: gameState.combo });
    if ([5, 10, 25, 50].includes(gameState.combo)) {
      EventBus.emit(Events.SPECTACLE_STREAK, { streak: gameState.combo });
    }

    gameState.chaosEndTime = Math.min(gameState.chaosEndTime, nowMs + 140);
  }

  private _handleAttackFail(event: ChaosEventName, reason: "timeout" | "baited") {
    this._attackResolved = true;
    gameState.combo = 0;

    if (event === "heat_burst") {
      gameState.heat = Math.min(MACHINE.MAX_HEAT, gameState.heat + 20);
    } else if (event === "pressure_crash") {
      gameState.pressure = Math.min(MACHINE.MAX_PRESSURE, gameState.pressure + 24);
    } else if (event === "voltage_surge") {
      gameState.pressure = Math.min(MACHINE.MAX_PRESSURE, gameState.pressure + 16);
      gameState.heat = Math.min(MACHINE.MAX_HEAT, gameState.heat + 8);
    } else if (event === "control_inversion") {
      gameState.heat = Math.min(MACHINE.MAX_HEAT, gameState.heat + 12);
    } else {
      gameState.heat = Math.min(MACHINE.MAX_HEAT, gameState.heat + 10);
      gameState.pressure = Math.min(MACHINE.MAX_PRESSURE, gameState.pressure + 10);
    }

    gameState.score = Math.max(0, gameState.score - 18);
    this._showWarning(reason === "baited" ? "BAITED! WRONG MOVE" : "TOO LATE!", PALETTE.HEAT);
    this._triggerFlash(0.45, PALETTE.HEAT);
    this._triggerScreenShake(280, 6 * DPR);
    this._playCommSignal(MACHINE_COMMS.FAIL[reason]);
    EventBus.emit(Events.SPECTACLE_ACTION, {
      type: "attack_fail",
      event,
      reason,
    });
  }

  private _bootMachineComms() {
    this._playCommSignal(MACHINE_COMMS.STARTUP);
    this._queueIdleComm(900);
  }

  private _playCommSignal(signal: MachineCommSignal) {
    this._setMachineComm(signal.text, signal.color);
    this._clearCommPulseEvents();

    for (const pulse of signal.pulses) {
      let timerEvent: Time.TimerEvent;
      timerEvent = this.time.delayedCall(pulse.at, () => {
        this._commPulseEvents.delete(timerEvent);
        this.sound.play("beep", {
          rate: pulse.rate,
          detune: pulse.detune,
          volume: pulse.volume,
        });
      });
      this._commPulseEvents.add(timerEvent);
    }
  }

  private _queueIdleComm(delayMs: number) {
    this.time.delayedCall(delayMs, () => {
      if (gameState.activeChaosEvent !== null || gameState.gameOver) return;
      this._setMachineComm(MACHINE_COMMS.IDLE_TEXT, MACHINE_COMMS.IDLE_COLOR);
    });
  }

  private _setMachineComm(text: string, color: string) {
    this._commsText.setText(text);
    this._commsText.setColor(color);
    this._commsText.setAlpha(0.95);
  }

  private _clearCommPulseEvents() {
    for (const event of this._commPulseEvents) {
      event.remove(false);
    }
    this._commPulseEvents.clear();
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

  private _cleanup = () => {
    this._clearCommPulseEvents();
    this._music.stop();
    this._motion.stop();
    EventBus.off(Events.CHAOS_START, this._onChaosStart, this);
    EventBus.off(Events.CHAOS_END, this._onChaosEnd, this);
    EventBus.off(Events.MELTDOWN, this._onGameOver, this);
    EventBus.off(Events.EXPLOSION, this._onGameOver, this);
  };
}
