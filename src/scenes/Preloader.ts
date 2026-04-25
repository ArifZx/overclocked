import { Scene, type GameObjects } from "phaser";
import {
  GAME,
  getLevelConfig,
  getLevelLabel,
  LEVELS,
  PALETTE,
  UI,
  DPR,
  PX,
} from "../core/Constants";
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
  private _levelPanelBg!: GfxField;
  private _levelOptionBgs: GfxField[] = [];
  private _levelOptionTexts: TextField[] = [];
  private _levelOptionHints: TextField[] = [];
  private _levelOptionZones: GameObjects.Zone[] = [];
  private _music!: MachineMusicSystem;
  private _flickerTimer = 0;
  private _btnPressed = false;
  private _selectionOpen = false;

  constructor() {
    super("Preloader");
  }

  preload() {
    this.load.audio("beep", ["sounds/beep.ogg", "sounds/beep.m4a", "sounds/beep.mp3"]);
  }

  create() {
    this._btnPressed = false;
    this._selectionOpen = false;
    this._flickerTimer = 0;
    this._levelOptionBgs = [];
    this._levelOptionTexts = [];
    this._levelOptionHints = [];
    this._levelOptionZones = [];

    this._music = new MachineMusicSystem(this);
    this._createBackground();
    this._createMachineArt();
    this._createTitle();
    this._createButton();
    this._createLevelSelection();
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
    const r = Math.min(UI.CONTENT_W, GAME.HEIGHT) * 0.18;

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
    const titleSize = Math.round(Math.min(UI.CONTENT_W * 0.18, 38 * PX));
    const subtitleSize = Math.round(Math.min(UI.CONTENT_W * 0.1, 22 * PX));
    const taglineSize = Math.round(Math.min(UI.CONTENT_W * 0.05, 14 * PX));

    this._title = this.add.text(cx, safeTop + UI.USABLE_H * 0.52, "OVERCLOCK", {
      fontSize: `${Math.max(26, titleSize)}px`,
      fontFamily: "monospace",
      color: PALETTE.TEXT,
      stroke: "#00d4ff",
      strokeThickness: 1 * DPR,
      align: "center",
    });
    this._title.setOrigin(0.5, 0.5);
    this._title.setAlpha(0);

    const subtitle = this.add.text(cx, safeTop + UI.USABLE_H * 0.58, "P A N I C", {
      fontSize: `${Math.max(16, subtitleSize)}px`,
      fontFamily: "monospace",
      color: "#ff3333",
      letterSpacing: Math.max(3, Math.round(8 * PX)),
      align: "center",
    });
    subtitle.setOrigin(0.5, 0.5);
    subtitle.setAlpha(0);

    this._tagline = this.add.text(
      cx,
      safeTop + UI.USABLE_H * 0.65,
      "Don't just play it. Handle it.",
      {
        fontSize: `${Math.max(11, taglineSize)}px`,
        fontFamily: "monospace",
        color: PALETTE.TEXT_DIM,
        align: "center",
        wordWrap: { width: UI.CONTENT_W },
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
    const bw = Math.min(GAME.WIDTH * 0.65, UI.CONTENT_W);
    const bh = Math.max(42, Math.round(52 * PX));
    const bx = cx - bw / 2;

    // Store bx/by/bw/bh before the first draw so the button is visible immediately.
    this.data.set("btn", { bx, by, bw, bh });

    this._btnBg = this.add.graphics();
    this._btnBg.setAlpha(0);
    this._drawBtn(false);

    this._btnText = this.add.text(cx, by + bh / 2, "⚡  START GAME", {
      fontSize: `${Math.max(14, Math.round(18 * PX))}px`,
      fontFamily: "monospace",
      color: "#0a0a14",
      align: "center",
    });
    this._btnText.setOrigin(0.5, 0.5);
    this._btnText.setAlpha(0);

    this._hint = this.add.text(cx, by + bh + 14 * DPR, "", {
      fontSize: `${Math.max(10, Math.round(12 * PX))}px`,
      fontFamily: "monospace",
      color: PALETTE.TEXT_DIM,
      align: "center",
      wordWrap: { width: UI.CONTENT_W },
    });
    this._hint.setOrigin(0.5, 0);
    this._hint.setAlpha(0);

    // Determine if permission needed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const needsPermission = typeof (DeviceOrientationEvent as any).requestPermission === "function";
    this._btnText.setText("⚡  SELECT LEVEL");
    this._hint.setText(
      needsPermission
        ? "Pick a stage, then enable motion or use touch fallback"
        : "Pick a stage before launching the run",
    );

    // Make the button area interactive
    const zone = this.add.zone(cx, by + bh / 2, bw, bh).setInteractive();
    zone.on("pointerdown", () => {
      if (this._btnPressed) return;
      void this._onButtonPress();
    });
    zone.on("pointerover", () => this._drawBtn(true));
    zone.on("pointerout", () => this._drawBtn(false));
  }

  private _createLevelSelection() {
    const cx = GAME.WIDTH / 2;
    const panelW = Math.min(UI.CONTENT_W, GAME.WIDTH * 0.84);
    const optionW = panelW * 0.46;
    const optionH = Math.max(54, Math.round(62 * PX));
    const gapX = panelW * 0.08;
    const gapY = Math.max(12, Math.round(14 * PX));
    const startY = UI.SAFE_TOP + UI.USABLE_H * 0.72;
    const panelH = optionH * 3 + gapY * 2 + 26 * PX;
    const panelX = cx - panelW / 2;
    const panelY = startY - 18 * PX;

    this._levelPanelBg = this.add.graphics();
    this._levelPanelBg.fillStyle(PALETTE.PANEL, 0.9);
    this._levelPanelBg.fillRoundedRect(panelX, panelY, panelW, panelH, 14 * PX);
    this._levelPanelBg.lineStyle(1, PALETTE.PANEL_BORDER, 0.9);
    this._levelPanelBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 14 * PX);
    this._levelPanelBg.setAlpha(0);

    const levels = [1, 2, 3, 4, 5, LEVELS.ENDLESS];
    levels.forEach((level, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2;
      const x = cx + (col === 0 ? -(optionW + gapX) / 2 : (optionW + gapX) / 2);
      const y = startY + row * (optionH + gapY);
      const bg = this.add.graphics().setAlpha(0);
      const text = this.add
        .text(x, y - 10 * PX, getLevelLabel(level), {
          fontSize: `${Math.max(12, Math.round(14 * PX))}px`,
          fontFamily: "monospace",
          color: "#f3fbff",
          align: "center",
        })
        .setOrigin(0.5, 0.5)
        .setAlpha(0);
      const hint = this.add
        .text(x, y + 10 * PX, getLevelConfig(level).briefing, {
          fontSize: `${Math.max(9, Math.round(10 * PX))}px`,
          fontFamily: "monospace",
          color: "#9bdfff",
          align: "center",
          wordWrap: { width: optionW * 0.88 },
        })
        .setOrigin(0.5, 0.5)
        .setAlpha(0);
      const zone = this.add.zone(x, y, optionW, optionH).disableInteractive();

      const draw = (hover: boolean) => {
        bg.clear();
        bg.fillStyle(hover ? 0x17334a : 0x10182a, hover ? 0.96 : 0.94);
        bg.fillRoundedRect(x - optionW / 2, y - optionH / 2, optionW, optionH, 10 * PX);
        bg.lineStyle(
          hover ? 2 * PX : 1 * PX,
          hover ? PALETTE.WHITE : PALETTE.VOLTAGE,
          hover ? 0.7 : 0.55,
        );
        bg.strokeRoundedRect(x - optionW / 2, y - optionH / 2, optionW, optionH, 10 * PX);
      };

      draw(false);
      zone.on("pointerover", () => draw(true));
      zone.on("pointerout", () => draw(false));
      zone.on("pointerdown", () => {
        if (this._btnPressed) return;
        void this._selectLevel(level);
      });

      this._levelOptionBgs.push(bg);
      this._levelOptionTexts.push(text);
      this._levelOptionHints.push(hint);
      this._levelOptionZones.push(zone);
    });
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
    if (!this._selectionOpen) {
      this._openLevelSelection();
      return;
    }

    this._btnPressed = false;
  }

  private _openLevelSelection() {
    this._selectionOpen = true;
    this._btnText.setText("SELECT A STARTING STAGE");
    this._hint.setText("Stage 1-5 = campaign // Level 6 = endless");
    this._hint.setAlpha(0.8);

    this.tweens.add({ targets: this._levelPanelBg, alpha: 1, duration: 220 });
    for (const zone of this._levelOptionZones) {
      zone.setInteractive();
    }
    for (const target of [
      ...this._levelOptionBgs,
      ...this._levelOptionTexts,
      ...this._levelOptionHints,
    ]) {
      this.tweens.add({ targets: target, alpha: 1, duration: 220 });
    }
  }

  private async _selectLevel(level: number) {
    this._btnPressed = true;
    this._drawBtn(false);
    gameState.selectedLevel = level;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const needsPermission = typeof (DeviceOrientationEvent as any).requestPermission === "function";

    if (needsPermission) {
      this._btnText.setText(`LINKING ${getLevelLabel(level)}...`);
      await MotionSystem.requestPermission();

      if (gameState.motionPermission === "denied") {
        this._hint.setText("Motion denied — launching with touch fallback");
      }
    }

    this._launchGame(level);
  }

  private _launchGame(level: number) {
    this._music.stop();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("Game", { startLevel: level });
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
