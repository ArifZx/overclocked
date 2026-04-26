import { Scene, type GameObjects } from "phaser";
import { GAME, getLevelLabel, LEVELS, PALETTE, UI, DPR, PX } from "../core/Constants";
import { EventBus, Events } from "../core/EventBus";
import { gameState } from "../core/GameState";
import { achievementSystem } from "../services/AchevmentService";
import { leaderboardService } from "../services/LeaderboardServce";
import { MachineMusicSystem } from "../systems/MachineMusicSystem";

export class GameOver extends Scene {
  private _music!: MachineMusicSystem;
  private _submitStatusText!: GameObjects.Text;

  constructor() {
    super("GameOver");
  }

  create() {
    this._music = new MachineMusicSystem(this);
    const cx = GAME.WIDTH / 2;
    const st = UI.SAFE_TOP;
    const uh = UI.USABLE_H;
    const isCompact = UI.IS_COMPACT_H;
    const headerFontSize = Math.max(22, Math.round((isCompact ? 26 : 32) * PX));
    const offlineFontSize = Math.max(12, Math.round((isCompact ? 14 : 16) * PX));
    const scoreFontSize = Math.max(30, Math.round((isCompact ? 36 : 44) * PX));
    const buttonFontSize = Math.max(14, Math.round((isCompact ? 16 : 18) * PX));
    const taglineFontSize = Math.max(10, Math.round((isCompact ? 10 : 11) * PX));
    const scorePanelY = st + uh * (isCompact ? 0.3 : 0.32);
    const scorePanelH = uh * (isCompact ? 0.22 : 0.26);
    const bestY = st + uh * (isCompact ? 0.51 : 0.56);
    const machineY = st + uh * (isCompact ? 0.59 : 0.65);
    const levelY = st + uh * (isCompact ? 0.64 : 0.7);
    const bestLevelY = st + uh * (isCompact ? 0.68 : 0.74);
    const submitStatusY = st + uh * (isCompact ? 0.72 : 0.76);
    const primaryButtonY = st + uh * (isCompact ? 0.78 : 0.8);
    const secondaryButtonY = st + uh * (isCompact ? 0.87 : 0.89);
    const taglineY = st + uh * (isCompact ? 0.89 : 0.91);

    this._createBackground();

    // Death reason header
    const isExplosion = gameState.deathReason === "explosion";
    const headerColor = isExplosion ? "#44ff88" : "#ff3333";
    const headerText = isExplosion ? "💥 EXPLOSION" : "🔥 MELTDOWN";

    this.add
      .text(cx, st + uh * 0.12, headerText, {
        fontSize: `${headerFontSize}px`,
        fontFamily: "monospace",
        color: headerColor,
        align: "center",
        stroke: "#000000",
        strokeThickness: 2 * DPR,
      })
      .setOrigin(0.5, 0.5);

    this.add
      .text(cx, st + uh * 0.21, "SYSTEM OFFLINE", {
        fontSize: `${offlineFontSize}px`,
        fontFamily: "monospace",
        color: PALETTE.TEXT_DIM,
        align: "center",
        letterSpacing: Math.max(2, Math.round(4 * PX)),
      })
      .setOrigin(0.5, 0.5);

    // Score panel
    this._createPanel(cx - UI.CONTENT_W / 2, scorePanelY, UI.CONTENT_W, scorePanelH);

    this.add
      .text(cx, st + uh * 0.38, "SCORE", {
        fontSize: UI.MACHINE_FS,
        fontFamily: "monospace",
        color: PALETTE.TEXT_DIM,
      })
      .setOrigin(0.5, 0.5);

    this.add
      .text(cx, st + uh * 0.47, Math.floor(gameState.score).toString().padStart(6, "0"), {
        fontSize: `${scoreFontSize}px`,
        fontFamily: "monospace",
        color: PALETTE.TEXT,
      })
      .setOrigin(0.5, 0.5);

    // Best score
    const isBest = Math.floor(gameState.score) >= gameState.bestScore;
    if (isBest) {
      this.add
        .text(cx, bestY, "✦ NEW BEST ✦", {
          fontSize: UI.MACHINE_FS,
          fontFamily: "monospace",
          color: "#ffcc00",
        })
        .setOrigin(0.5, 0.5);
    } else {
      this.add
        .text(cx, bestY, `BEST: ${gameState.bestScore.toString().padStart(6, "0")}`, {
          fontSize: UI.MACHINE_FS,
          fontFamily: "monospace",
          color: PALETTE.TEXT_DIM,
        })
        .setOrigin(0.5, 0.5);
    }

    // Machine type that was running
    const machineLabel = gameState.machineConfig.label;
    this.add
      .text(cx, machineY, machineLabel, {
        fontSize: UI.MACHINE_FS,
        fontFamily: "monospace",
        color: PALETTE.TEXT_DIM,
      })
      .setOrigin(0.5, 0.5);

    const runLabel =
      gameState.level >= LEVELS.ENDLESS
        ? "ENDLESS // BEST COMBO"
        : `${getLevelLabel(gameState.level)} // BEST COMBO`;

    this.add
      .text(cx, levelY, `${runLabel} x${gameState.bestCombo}`, {
        fontSize: UI.MACHINE_FS,
        fontFamily: "monospace",
        color: "#ffcc00",
      })
      .setOrigin(0.5, 0.5);

    this.add
      .text(cx, bestLevelY, `BEST STAGE: ${getLevelLabel(gameState.bestLevel)}`, {
        fontSize: UI.MACHINE_FS,
        fontFamily: "monospace",
        color: PALETTE.TEXT_DIM,
      })
      .setOrigin(0.5, 0.5);

    this._submitStatusText = this.add
      .text(cx, submitStatusY, "SYNCING SCORE...", {
        fontSize: UI.VALUE_FS,
        fontFamily: "monospace",
        color: "#92ffd0",
        align: "center",
      })
      .setOrigin(0.5, 0.5)
      .setAlpha(0);

    // Action buttons
    const bw = Math.min(GAME.WIDTH * 0.55, UI.CONTENT_W * 0.72);
    const bh = Math.max(40, Math.round((isCompact ? 44 : 52) * PX));
    this._createButton(
      cx,
      primaryButtonY,
      bw,
      bh,
      "PLAY AGAIN",
      PALETTE.VOLTAGE,
      () => {
        this._restart();
      },
      buttonFontSize,
    );
    this._createButton(
      cx,
      secondaryButtonY,
      bw,
      bh,
      "EXIT TO LANDING",
      PALETTE.PANEL_BORDER,
      () => {
        this._goToLanding();
      },
      buttonFontSize,
      PALETTE.TEXT,
    );

    // Bottom tagline
    this.add
      .text(cx, taglineY, '"You don\'t control the machine. You survive it."', {
        fontSize: `${taglineFontSize}px`,
        fontFamily: "monospace",
        color: PALETTE.TEXT_DIM,
        align: "center",
        wordWrap: { width: Math.min(GAME.WIDTH * 0.8, UI.CONTENT_W * 0.92) },
      })
      .setOrigin(0.5, 0.5);

    this._music.start("game_over");
    void this._submitScore();
    this.events.on("shutdown", this._cleanup, this);
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  private async _submitScore() {
    const score = Math.floor(gameState.score);
    if (score <= 0) {
      return;
    }

    this._submitStatusText.setAlpha(1);
    this._submitStatusText.setText("SYNCING SCORE...");
    this._submitStatusText.setColor("#92ffd0");

    try {
      const response = await leaderboardService.submitScore(score);
      if (response instanceof Response && !response.ok) {
        throw new Error(`Submit failed with status ${response.status}`);
      }

      if (!this.scene.isActive()) {
        return;
      }

      this._submitStatusText.setText("SCORE SYNCED");
      this._submitStatusText.setColor("#92ffd0");
    } catch {
      if (!this.scene.isActive()) {
        return;
      }

      this._submitStatusText.setText("SYNC FAILED");
      this._submitStatusText.setColor("#ff9f73");
    }
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

  private _createButton(
    cx: number,
    y: number,
    width: number,
    height: number,
    label: string,
    fillColor: number,
    onClick: () => void,
    fontSize: number,
    textColor = "#0a0a14",
  ) {
    const x = cx - width / 2;
    const bg = this.add.graphics();
    const draw = (hovered: boolean) => {
      bg.clear();
      bg.fillStyle(hovered ? PALETTE.TEXT_HEX : fillColor, hovered ? 0.95 : 0.9);
      bg.fillRoundedRect(x, y, width, height, 8 * DPR);
    };

    draw(false);

    this.add
      .text(cx, y + height / 2, label, {
        fontSize: `${fontSize}px`,
        fontFamily: "monospace",
        color: hoveredTextColor(fillColor, textColor),
      })
      .setOrigin(0.5, 0.5);

    const zone = this.add.zone(cx, y + height / 2, width, height).setInteractive();
    zone.on("pointerover", () => draw(true));
    zone.on("pointerout", () => draw(false));
    zone.on("pointerdown", onClick);
  }

  private _restart() {
    this._music.stop();
    gameState.reset();
    achievementSystem.emit("game_played");
    EventBus.emit(Events.GAME_RESTART);
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("Game");
    });
  }

  private _goToLanding() {
    this._music.stop();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("Preloader");
    });
  }

  private _cleanup = () => {
    this._music.stop();
  };
}

function hoveredTextColor(fillColor: number, fallback: string) {
  return fillColor === PALETTE.PANEL_BORDER ? PALETTE.TEXT : fallback;
}
