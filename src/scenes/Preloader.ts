import { Scene, type GameObjects } from "phaser";
import { GAME, PALETTE, UI, DPR } from "../core/Constants";
import { MotionSystem } from "../systems/MotionSystem";
import { MachineMusicSystem } from "../systems/MachineMusicSystem";
import { gameState } from "../core/GameState";

type TextField = GameObjects.Text;
type GfxField = GameObjects.Graphics;

const randomBetween = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export class Preloader extends Scene {
  private _bgGfx!: GfxField;
  private _title!: TextField;
  private _tagline!: TextField;
  private _btnBg!: GfxField;
  private _btnText!: TextField;
  private _hint!: TextField;
  private _machineGfx!: GfxField;
  private _music!: MachineMusicSystem;
  private _flickerTimer = 0;
  private _btnPressed = false;

  constructor() {
    super("Preloader");
  }

  preload() {
    this.load.audio("beep", ["sounds/beep.ogg", "sounds/beep.m4a", "sounds/beep.mp3"]);
  }

  create() {
    this._music = new MachineMusicSystem(this);
    this._createBackground();
    this._createMachineArt();
    this._createTitle();
    this._createButton();
    this._createFloatingParticles();
    this._animateEntrance();

    if (this.sound.locked) {
      this.sound.once("unlocked", () => {
        if (!this._btnPressed) {
          this._music.start("landing");
        }
      });
    } else {
      this._music.start("landing");
    }

    this.events.on("shutdown", this._cleanup, this);
  }

  update(_time: number, delta: number) {
    this._flickerTimer += delta;
    // Subtle background grid pulse
    if (Math.floor(this._flickerTimer / 800) % 2 === 0) {
      this._bgGfx.setAlpha(1);
    } else {
      this._bgGfx.setAlpha(0.92);
    }
  }

  private _createBackground() {
    this._bgGfx = this.add.graphics();
    // Gradient BG
    this._bgGfx.fillGradientStyle(PALETTE.BG, PALETTE.BG, PALETTE.PANEL, PALETTE.PANEL, 1);
    this._bgGfx.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);

    // Grid lines
    const gridGfx = this.add.graphics();
    gridGfx.lineStyle(1, PALETTE.GRID, 0.5);
    const spacing = 40 * DPR;
    for (let x = 0; x < GAME.WIDTH; x += spacing) {
      gridGfx.lineBetween(x, 0, x, GAME.HEIGHT);
    }
    for (let y = 0; y < GAME.HEIGHT; y += spacing) {
      gridGfx.lineBetween(0, y, GAME.WIDTH, y);
    }
    gridGfx.setAlpha(0.4);
  }

  private _createMachineArt() {
    this._machineGfx = this.add.graphics();
    const cx = GAME.WIDTH / 2;
    const cy = UI.SAFE_TOP + UI.USABLE_H * 0.28;
    const r = GAME.WIDTH * 0.18;

    // Outer ring
    this._machineGfx.lineStyle(3 * DPR, PALETTE.VOLTAGE, 0.8);
    this._machineGfx.strokeCircle(cx, cy, r);

    // Inner rings
    this._machineGfx.lineStyle(2 * DPR, PALETTE.HEAT, 0.6);
    this._machineGfx.strokeCircle(cx, cy, r * 0.7);

    this._machineGfx.lineStyle(1 * DPR, PALETTE.PRESSURE, 0.5);
    this._machineGfx.strokeCircle(cx, cy, r * 0.4);

    // CPU square
    this._machineGfx.lineStyle(2 * DPR, PALETTE.TEXT_HEX, 0.9);
    const sq = r * 0.35;
    this._machineGfx.strokeRect(cx - sq / 2, cy - sq / 2, sq, sq);

    // Heat spikes around the circle
    this._machineGfx.lineStyle(2 * DPR, PALETTE.HEAT, 0.7);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const innerX = cx + Math.cos(angle) * r;
      const innerY = cy + Math.sin(angle) * r;
      const outerX = cx + Math.cos(angle) * (r + 12 * DPR);
      const outerY = cy + Math.sin(angle) * (r + 12 * DPR);
      this._machineGfx.lineBetween(innerX, innerY, outerX, outerY);
    }

    // Animate: rotate the outer ring
    this.tweens.add({
      targets: this._machineGfx,
      angle: 360,
      duration: 6000,
      repeat: -1,
      ease: "Linear",
    });
  }

  private _createTitle() {
    const cx = GAME.WIDTH / 2;
    const safeTop = UI.SAFE_TOP;

    this._title = this.add.text(cx, safeTop + UI.USABLE_H * 0.52, "OVERCLOCK", {
      fontSize: `${Math.round(38 * DPR)}px`,
      fontFamily: "monospace",
      color: PALETTE.TEXT,
      stroke: "#00d4ff",
      strokeThickness: 1 * DPR,
      align: "center",
    });
    this._title.setOrigin(0.5, 0.5);
    this._title.setAlpha(0);

    const subtitle = this.add.text(cx, safeTop + UI.USABLE_H * 0.58, "P A N I C", {
      fontSize: `${Math.round(22 * DPR)}px`,
      fontFamily: "monospace",
      color: "#ff3333",
      letterSpacing: 8 * DPR,
      align: "center",
    });
    subtitle.setOrigin(0.5, 0.5);
    subtitle.setAlpha(0);

    this._tagline = this.add.text(
      cx,
      safeTop + UI.USABLE_H * 0.65,
      "Don't just play it. Handle it.",
      {
        fontSize: `${Math.round(14 * DPR)}px`,
        fontFamily: "monospace",
        color: PALETTE.TEXT_DIM,
        align: "center",
      },
    );
    this._tagline.setOrigin(0.5, 0.5);
    this._tagline.setAlpha(0);

    // Store subtitle ref for entrance tween
    this.data.set("subtitle", subtitle);
  }

  private _createButton() {
    const cx = GAME.WIDTH / 2;
    const by = UI.SAFE_TOP + UI.USABLE_H * 0.8;
    const bw = GAME.WIDTH * 0.65;
    const bh = 52 * DPR;
    const bx = cx - bw / 2;

    this._btnBg = this.add.graphics();
    this._btnBg.setAlpha(0);
    this._drawBtn(false);

    this._btnText = this.add.text(cx, by + bh / 2, "⚡  START GAME", {
      fontSize: `${Math.round(18 * DPR)}px`,
      fontFamily: "monospace",
      color: "#0a0a14",
      align: "center",
    });
    this._btnText.setOrigin(0.5, 0.5);
    this._btnText.setAlpha(0);

    this._hint = this.add.text(cx, by + bh + 14 * DPR, "", {
      fontSize: `${Math.round(12 * DPR)}px`,
      fontFamily: "monospace",
      color: PALETTE.TEXT_DIM,
      align: "center",
    });
    this._hint.setOrigin(0.5, 0);
    this._hint.setAlpha(0);

    // Determine if permission needed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const needsPermission = typeof (DeviceOrientationEvent as any).requestPermission === "function";
    if (needsPermission) {
      this._btnText.setText("⚡  ENABLE MOTION");
      this._hint.setText("Required for tilt & shake controls");
    } else {
      this._hint.setText("Touch controls available as fallback");
    }

    // Make the button area interactive
    const zone = this.add.zone(cx, by + bh / 2, bw, bh).setInteractive();
    zone.on("pointerdown", () => {
      if (this._btnPressed) return;
      void this._onButtonPress();
    });
    zone.on("pointerover", () => this._drawBtn(true));
    zone.on("pointerout", () => this._drawBtn(false));

    // Store bx/by/bw/bh for redraws
    this.data.set("btn", { bx, by, bw, bh });
  }

  private _drawBtn(hover: boolean) {
    const d = this.data.get("btn") as
      | { bx: number; by: number; bw: number; bh: number }
      | undefined;
    if (!d) return;

    this._btnBg.clear();
    const color = hover ? PALETTE.TEXT_HEX : PALETTE.VOLTAGE;
    this._btnBg.fillStyle(color, hover ? 0.95 : 0.9);
    this._btnBg.fillRoundedRect(d.bx, d.by, d.bw, d.bh, 8 * DPR);

    if (hover) {
      this._btnBg.lineStyle(2 * DPR, PALETTE.WHITE, 0.5);
      this._btnBg.strokeRoundedRect(d.bx, d.by, d.bw, d.bh, 8 * DPR);
    }
  }

  private async _onButtonPress() {
    this._btnPressed = true;
    this._drawBtn(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const needsPermission = typeof (DeviceOrientationEvent as any).requestPermission === "function";

    if (needsPermission) {
      this._btnText.setText("Requesting...");
      await MotionSystem.requestPermission();

      if (gameState.motionPermission === "denied") {
        this._btnText.setText("⚡  PLAY (Touch Controls)");
        this._hint.setText("Motion denied — using touch fallback");
        this._btnPressed = false;
        await new Promise<void>((r) => setTimeout(r, 1200));
      }
    }

    this._launchGame();
  }

  private _launchGame() {
    this._music.stop();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("Game");
    });
  }

  private _animateEntrance() {
    const subtitle = this.data.get("subtitle") as TextField;

    this.tweens.add({
      targets: this._title,
      alpha: 1,
      duration: 600,
      delay: 200,
    });
    this.tweens.add({ targets: subtitle, alpha: 1, duration: 600, delay: 500 });
    this.tweens.add({
      targets: this._tagline,
      alpha: 1,
      duration: 600,
      delay: 800,
    });
    this.tweens.add({
      targets: this._btnBg,
      alpha: 1,
      duration: 600,
      delay: 1100,
    });
    this.tweens.add({
      targets: this._btnText,
      alpha: 1,
      duration: 600,
      delay: 1100,
    });
    this.tweens.add({
      targets: this._hint,
      alpha: 0.7,
      duration: 600,
      delay: 1400,
    });
  }

  private _createFloatingParticles() {
    // Small floating dots to decorate background
    for (let i = 0; i < 18; i++) {
      const gfx = this.add.graphics();
      const x = Math.random() * GAME.WIDTH;
      const y = Math.random() * GAME.HEIGHT;
      const color = [PALETTE.VOLTAGE, PALETTE.HEAT, PALETTE.PRESSURE][
        Math.floor(Math.random() * 3)
      ];
      gfx.fillStyle(color, 0.6);
      gfx.fillCircle(0, 0, 2 * DPR);
      gfx.setPosition(x, y);

      this.tweens.add({
        targets: gfx,
        y: y - randomBetween(30, 120) * DPR,
        alpha: { from: 0.6, to: 0 },
        duration: randomBetween(2000, 4000),
        delay: randomBetween(0, 3000),
        repeat: -1,
        repeatDelay: randomBetween(500, 2000),
        onRepeat: () => {
          gfx.setPosition(
            Math.random() * GAME.WIDTH,
            GAME.HEIGHT * 0.9 + Math.random() * GAME.HEIGHT * 0.1,
          );
          gfx.setAlpha(0.6);
        },
      });
    }
  }

  private _cleanup = () => {
    this._music.stop();
  };
}
