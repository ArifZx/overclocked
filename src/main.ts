import { Game, AUTO } from "phaser";

import "./style.css";

function preload() {}

function create() {}

function update() {}

(function () {
  const game = new Game({
    type: AUTO,
    width: 800,
    height: 600,
    parent: "#app",
    scene: {
      preload,
      create,
      update,
    },
  });

  return game;
})();
