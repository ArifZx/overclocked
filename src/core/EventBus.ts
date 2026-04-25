import { Events as PhaserEvents } from "phaser";

export const EventBus = new PhaserEvents.EventEmitter();

export const Events = {
  // ── Game flow ──────────────────────────────────────────────────────────────
  GAME_START: "game:start",
  GAME_OVER: "game:over",
  GAME_RESTART: "game:restart",

  // ── Motion permission ─────────────────────────────────────────────────────
  MOTION_PERMISSION_GRANTED: "motion:permission_granted",
  MOTION_PERMISSION_DENIED: "motion:permission_denied",

  // ── Machine state ─────────────────────────────────────────────────────────
  HEAT_CHANGED: "machine:heat_changed",
  VOLTAGE_CHANGED: "machine:voltage_changed",
  PRESSURE_CHANGED: "machine:pressure_changed",
  SCORE_CHANGED: "score:changed",
  MELTDOWN: "machine:meltdown",
  EXPLOSION: "machine:explosion",

  // ── Chaos ─────────────────────────────────────────────────────────────────
  CHAOS_START: "chaos:start",
  CHAOS_END: "chaos:end",

  // ── Spectacle hooks ───────────────────────────────────────────────────────
  SPECTACLE_ENTRANCE: "spectacle:entrance",
  SPECTACLE_ACTION: "spectacle:action",
  SPECTACLE_HIT: "spectacle:hit",
  SPECTACLE_COMBO: "spectacle:combo",
  SPECTACLE_STREAK: "spectacle:streak",
  SPECTACLE_NEAR_MISS: "spectacle:near_miss",
} as const;
