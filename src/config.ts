import { AUTO, Scale, type Types } from "phaser";
import { GAME } from "./core/Constants";
import { Boot } from "./scenes/Boot";
import { Preloader } from "./scenes/Preloader";
import { Game } from "./scenes/Game";
import { GameOver } from "./scenes/GameOver";
import { LevelClear } from "./scenes/LevelClear";

export const config: Types.Core.GameConfig = {
  type: AUTO,
  width: GAME.WIDTH,
  height: GAME.HEIGHT,
  parent: "app",
  backgroundColor: "#06060c",
  roundPixels: true,
  antialias: true,
  scale: {
    mode: Scale.RESIZE,
    autoCenter: Scale.CENTER_BOTH,
  },
  scene: [Boot, Preloader, Game, LevelClear, GameOver],
};
