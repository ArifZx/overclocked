import { Scene, type Time } from "phaser";
import {
  DPR,
  GAME,
  getLevelConfig,
  getLevelLabel,
  LEVELS,
  MACHINE_COMMS,
  PALETTE,
  PX,
  UI,
} from "../core/Constants";
import type { MachineCommSignal } from "../core/Constants";
import { gameState } from "../core/GameState";

type LevelClearData = {
  completedLevel?: number;
  nextLevel?: number;
};

export class LevelClear extends Scene {
  private _completedLevel = LEVELS.START;
  private _nextLevel = LEVELS.START + 1;
  private readonly _commPulseEvents = new Set<Time.TimerEvent>();

  constructor() {
    super("LevelClear");
  }

  init(data: LevelClearData) {
    this._completedLevel = data.completedLevel ?? gameState.level;
    this._nextLevel = data.nextLevel ?? Math.min(LEVELS.ENDLESS, this._completedLevel + 1);
  }

  create() {
    const cx = GAME.WIDTH / 2;
    const st = UI.SAFE_TOP;
    const uh = UI.USABLE_H;
    const isCompact = UI.IS_COMPACT_H;
    const headerFontSize = Math.max(24, Math.round((isCompact ? 26 : 34) * PX));
    const subFontSize = Math.max(12, Math.round((isCompact ? 14 : 16) * PX));
    const titleFontSize = Math.max(22, Math.round((isCompact ? 26 : 30) * PX));
    const bodyFontSize = Math.max(12, Math.round((isCompact ? 14 : 16) * PX));
    const scoreFontSize = Math.max(24, Math.round((isCompact ? 28 : 36) * PX));
    const buttonFontSize = Math.max(14, Math.round((isCompact ? 16 : 18) * PX));
    const buttonWidth = Math.min(GAME.WIDTH * 0.58, UI.CONTENT_W * 0.76);
    const buttonHeight = Math.max(42, Math.round((isCompact ? 44 : 52) * PX));
    const completedConfig = getLevelConfig(this._completedLevel);
    const nextConfig = getLevelConfig(this._nextLevel);
    const nextLabel =
      this._nextLevel >= LEVELS.ENDLESS
        ? "ENDLESS UNLOCKED"
        : `${getLevelLabel(this._nextLevel)} // ${nextConfig.label}`;

    this._createBackground();
    this._createPanel(cx - UI.CONTENT_W / 2, st + uh * 0.22, UI.CONTENT_W, uh * 0.44);

    this.add
      .text(cx, st + uh * 0.12, "STAGE CLEAR", {
        fontSize: `${headerFontSize}px`,
        fontFamily: "monospace",
        color: "#92ffd0",
        stroke: "#000000",
        strokeThickness: 2 * DPR,
        align: "center",
      })
      .setOrigin(0.5, 0.5);

    this.add
      .text(
        cx,
        st + uh * 0.18,
        `${getLevelLabel(this._completedLevel)} // ${completedConfig.label}`,
        {
          fontSize: `${subFontSize}px`,
          fontFamily: "monospace",
          color: PALETTE.TEXT_DIM,
          align: "center",
        },
      )
      .setOrigin(0.5, 0.5);

    this.add
      .text(cx, st + uh * 0.31, "LINK STABLE", {
        fontSize: `${titleFontSize}px`,
        fontFamily: "monospace",
        color: PALETTE.TEXT,
        align: "center",
      })
      .setOrigin(0.5, 0.5);

    this.add
      .text(cx, st + uh * 0.38, nextLabel, {
        fontSize: `${bodyFontSize}px`,
        fontFamily: "monospace",
        color: "#ffcc00",
        align: "center",
        wordWrap: { width: Math.min(UI.CONTENT_W * 0.84, GAME.WIDTH * 0.8) },
      })
      .setOrigin(0.5, 0.5);

    this.add
      .text(
        cx,
        st + uh * 0.46,
        `SCORE ${Math.floor(gameState.score).toString().padStart(6, "0")}`,
        {
          fontSize: `${scoreFontSize}px`,
          fontFamily: "monospace",
          color: PALETTE.TEXT,
          align: "center",
        },
      )
      .setOrigin(0.5, 0.5);

    this.add
      .text(cx, st + uh * 0.53, `BEST COMBO x${gameState.bestCombo}`, {
        fontSize: `${bodyFontSize}px`,
        fontFamily: "monospace",
        color: PALETTE.TEXT_DIM,
        align: "center",
      })
      .setOrigin(0.5, 0.5);

    this._createButton(
      cx,
      st + uh * (isCompact ? 0.69 : 0.72),
      buttonWidth,
      buttonHeight,
      this._nextLevel >= LEVELS.ENDLESS ? "ENTER ENDLESS" : "NEXT STAGE",
      PALETTE.PRESSURE,
      () => this._goNext(),
      buttonFontSize,
      "#0a0a14",
    );
    this._createButton(
      cx,
      st + uh * (isCompact ? 0.79 : 0.82),
      buttonWidth,
      buttonHeight,
      "EXIT TO LANDING",
      PALETTE.PANEL_BORDER,
      () => this._exitToLanding(),
      buttonFontSize,
      PALETTE.TEXT,
    );

    this._playCommSignal(MACHINE_COMMS.CONGRATS);
    this.events.on("shutdown", this._cleanup, this);
    this.cameras.main.fadeIn(320, 0, 0, 0);
  }

  private _createBackground() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(PALETTE.BG, PALETTE.BG, PALETTE.PANEL, PALETTE.PANEL, 1);
    bg.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);

    const grid = this.add.graphics();
    grid.lineStyle(1, PALETTE.GRID, 0.24);
    const spacing = 40 * DPR;
    for (let x = 0; x < GAME.WIDTH; x += spacing) grid.lineBetween(x, 0, x, GAME.HEIGHT);
    for (let y = 0; y < GAME.HEIGHT; y += spacing) grid.lineBetween(0, y, GAME.WIDTH, y);
  }

  private _createPanel(x: number, y: number, w: number, h: number) {
    const panel = this.add.graphics();
    panel.fillStyle(PALETTE.PANEL, 0.84);
    panel.fillRoundedRect(x, y, w, h, 12 * DPR);
    panel.lineStyle(1, PALETTE.PANEL_BORDER, 0.9);
    panel.strokeRoundedRect(x, y, w, h, 12 * DPR);
  }

  private _createButton(
    cx: number,
    y: number,
    width: number,
    height: number,
    label: string,
    fillColor: number,
    onClick: () => void,
    fontSize: number,
    textColor: string,
  ) {
    const x = cx - width / 2;
    const bg = this.add.graphics();
    const text = this.add
      .text(cx, y + height / 2, label, {
        fontSize: `${fontSize}px`,
        fontFamily: "monospace",
        color: textColor,
        align: "center",
      })
      .setOrigin(0.5, 0.5);

    const draw = (hovered: boolean) => {
      bg.clear();
      bg.fillStyle(hovered ? PALETTE.TEXT_HEX : fillColor, hovered ? 0.95 : 0.9);
      bg.fillRoundedRect(x, y, width, height, 8 * DPR);
      text.setColor(hovered ? "#0a0a14" : textColor);
    };

    draw(false);

    const zone = this.add.zone(cx, y + height / 2, width, height).setInteractive();
    zone.on("pointerover", () => draw(true));
    zone.on("pointerout", () => draw(false));
    zone.on("pointerdown", onClick);
  }

  private _goNext() {
    this.cameras.main.fadeOut(260, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("Game", { startLevel: this._nextLevel });
    });
  }

  private _exitToLanding() {
    this.cameras.main.fadeOut(260, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("Preloader");
    });
  }

  private _playCommSignal(signal: MachineCommSignal) {
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

  private _clearCommPulseEvents() {
    for (const event of this._commPulseEvents) {
      event.remove(false);
    }
    this._commPulseEvents.clear();
  }

  private _cleanup = () => {
    this._clearCommPulseEvents();
  };
}
