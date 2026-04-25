import { Scene } from "phaser";
import { GAME, PALETTE, UI, DPR } from "../core/Constants";
import { EventBus, Events } from "../core/EventBus";
import { gameState } from "../core/GameState";
import { MachineMusicSystem } from "../systems/MachineMusicSystem";

export class GameOver extends Scene {
  private _music!: MachineMusicSystem;

  constructor() {
    super("GameOver");
  }

  create() {
    this._music = new MachineMusicSystem(this);
    const cx = GAME.WIDTH / 2;
    const st = UI.SAFE_TOP;
    const uh = UI.USABLE_H;

    this._createBackground();

    // Death reason header
    const isExplosion = gameState.deathReason === "explosion";
    const headerColor = isExplosion ? "#44ff88" : "#ff3333";
    const headerText = isExplosion ? "💥 EXPLOSION" : "🔥 MELTDOWN";

    this.add
      .text(cx, st + uh * 0.12, headerText, {
        fontSize: `${Math.round(32 * DPR)}px`,
        fontFamily: "monospace",
        color: headerColor,
        align: "center",
        stroke: "#000000",
        strokeThickness: 2 * DPR,
      })
      .setOrigin(0.5, 0.5);

    this.add
      .text(cx, st + uh * 0.21, "SYSTEM OFFLINE", {
        fontSize: `${Math.round(16 * DPR)}px`,
        fontFamily: "monospace",
        color: PALETTE.TEXT_DIM,
        align: "center",
        letterSpacing: 4 * DPR,
      })
      .setOrigin(0.5, 0.5);

    // Score panel
    this._createPanel(cx - GAME.WIDTH * 0.38, st + uh * 0.32, GAME.WIDTH * 0.76, uh * 0.26);

    this.add
      .text(cx, st + uh * 0.38, "SCORE", {
        fontSize: UI.MACHINE_FS,
        fontFamily: "monospace",
        color: PALETTE.TEXT_DIM,
      })
      .setOrigin(0.5, 0.5);

    this.add
      .text(cx, st + uh * 0.47, Math.floor(gameState.score).toString().padStart(6, "0"), {
        fontSize: `${Math.round(44 * DPR)}px`,
        fontFamily: "monospace",
        color: PALETTE.TEXT,
      })
      .setOrigin(0.5, 0.5);

    // Best score
    const isBest = Math.floor(gameState.score) >= gameState.bestScore;
    if (isBest) {
      this.add
        .text(cx, st + uh * 0.56, "✦ NEW BEST ✦", {
          fontSize: UI.MACHINE_FS,
          fontFamily: "monospace",
          color: "#ffcc00",
        })
        .setOrigin(0.5, 0.5);
    } else {
      this.add
        .text(cx, st + uh * 0.56, `BEST: ${gameState.bestScore.toString().padStart(6, "0")}`, {
          fontSize: UI.MACHINE_FS,
          fontFamily: "monospace",
          color: PALETTE.TEXT_DIM,
        })
        .setOrigin(0.5, 0.5);
    }

    // Machine type that was running
    const machineLabel = gameState.machineConfig.label;
    this.add
      .text(cx, st + uh * 0.65, machineLabel, {
        fontSize: UI.MACHINE_FS,
        fontFamily: "monospace",
        color: PALETTE.TEXT_DIM,
      })
      .setOrigin(0.5, 0.5);

    this.add
      .text(cx, st + uh * 0.7, `LEVEL ${gameState.level} // BEST COMBO x${gameState.bestCombo}`, {
        fontSize: UI.MACHINE_FS,
        fontFamily: "monospace",
        color: "#ffcc00",
      })
      .setOrigin(0.5, 0.5);

    this.add
      .text(cx, st + uh * 0.74, `BEST LEVEL: ${gameState.bestLevel}`, {
        fontSize: UI.MACHINE_FS,
        fontFamily: "monospace",
        color: PALETTE.TEXT_DIM,
      })
      .setOrigin(0.5, 0.5);

    // Restart button
    const bw = GAME.WIDTH * 0.55;
    const bh = 52 * DPR;
    const bx = cx - bw / 2;
    const by = st + uh * 0.8;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(PALETTE.VOLTAGE, 0.9);
    btnBg.fillRoundedRect(bx, by, bw, bh, 8 * DPR);

    this.add
      .text(cx, by + bh / 2, "⚡  PLAY AGAIN", {
        fontSize: `${Math.round(18 * DPR)}px`,
        fontFamily: "monospace",
        color: "#0a0a14",
      })
      .setOrigin(0.5, 0.5);

    // Bottom tagline
    this.add
      .text(cx, st + uh * 0.91, '"You don\'t control the machine. You survive it."', {
        fontSize: `${Math.round(11 * DPR)}px`,
        fontFamily: "monospace",
        color: PALETTE.TEXT_DIM,
        align: "center",
        wordWrap: { width: GAME.WIDTH * 0.85 },
      })
      .setOrigin(0.5, 0.5);

    // Interactive zone over the restart button
    const btnZone = this.add.zone(cx, by + bh / 2, bw, bh).setInteractive();
    btnZone.on("pointerover", () => {
      btnBg.clear();
      btnBg.fillStyle(PALETTE.TEXT_HEX, 0.95);
      btnBg.fillRoundedRect(bx, by, bw, bh, 8 * DPR);
    });
    btnZone.on("pointerout", () => {
      btnBg.clear();
      btnBg.fillStyle(PALETTE.VOLTAGE, 0.9);
      btnBg.fillRoundedRect(bx, by, bw, bh, 8 * DPR);
    });
    btnZone.on("pointerdown", () => this._restart());

    this._music.start("game_over");
    this.events.on("shutdown", this._cleanup, this);
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  private _createBackground() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(PALETTE.BG, PALETTE.BG, PALETTE.PANEL, PALETTE.PANEL, 1);
    bg.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);

    // Subtle grid
    const grid = this.add.graphics();
    grid.lineStyle(1, PALETTE.GRID, 0.25);
    const sp = 40 * DPR;
    for (let x = 0; x < GAME.WIDTH; x += sp) grid.lineBetween(x, 0, x, GAME.HEIGHT);
    for (let y = 0; y < GAME.HEIGHT; y += sp) grid.lineBetween(0, y, GAME.WIDTH, y);
  }

  private _createPanel(x: number, y: number, w: number, h: number) {
    const panel = this.add.graphics();
    panel.fillStyle(PALETTE.PANEL, 0.8);
    panel.fillRoundedRect(x, y, w, h, 12 * DPR);
    panel.lineStyle(1, PALETTE.PANEL_BORDER, 0.9);
    panel.strokeRoundedRect(x, y, w, h, 12 * DPR);
  }

  private _restart() {
    this._music.stop();
    gameState.reset();
    EventBus.emit(Events.GAME_RESTART);
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("Game");
    });
  }

  private _cleanup = () => {
    this._music.stop();
  };
}
