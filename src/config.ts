import { AUTO, Scale, type Types } from "phaser";
import { GAME, DPR } from "./core/Constants";
import { Boot } from "./scenes/Boot";
import { Preloader } from "./scenes/Preloader";
import { Game } from "./scenes/Game";
import { GameOver } from "./scenes/GameOver";

export const config: Types.Core.GameConfig = {
  type: AUTO,
  width: GAME.WIDTH,
  height: GAME.HEIGHT,
  parent: "app",
  backgroundColor: "#06060c",
  roundPixels: true,
  antialias: true,
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
    zoom: 1 / DPR,
  },
  scene: [Boot, Preloader, Game, GameOver],
};
