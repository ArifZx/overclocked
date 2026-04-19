import { MACHINE, MACHINE_TYPES, MACHINE_CONFIGS } from "./Constants";
import type { ChaosEventName } from "./Constants";

export type MachineType = (typeof MACHINE_TYPES)[keyof typeof MACHINE_TYPES];

class GameState {
  // ── Machine simulation ─────────────────────────────────────────────────────
  heat = MACHINE.INITIAL_HEAT;
  voltage = MACHINE.INITIAL_VOLTAGE;
  pressure = 0;

  // ── Score ──────────────────────────────────────────────────────────────────
  score = 0;
  bestScore = 0;

  // ── Input state ───────────────────────────────────────────────────────────
  shakePower = 0;
  tiltAngle = 0; // raw gamma degrees
  flipTriggered = false;

  // ── Machine personality ────────────────────────────────────────────────────
  machineType: MachineType = MACHINE_TYPES.AGGRESSIVE;

  get machineConfig() {
    return MACHINE_CONFIGS[this.machineType];
  }

  // ── Chaos ─────────────────────────────────────────────────────────────────
  activeChaosEvent: ChaosEventName | null = null;
  chaosEndTime = 0;

  // ── Game lifecycle ────────────────────────────────────────────────────────
  started = false;
  gameOver = false;
  deathReason: "meltdown" | "explosion" | null = null;

  // ── Motion permission ─────────────────────────────────────────────────────
  motionPermission: "granted" | "denied" | "not_required" | "pending" = "pending";
  hasTouch =
    typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  // ── Convenience ───────────────────────────────────────────────────────────
  heatPct() {
    return this.heat / MACHINE.MAX_HEAT;
  }
  pressurePct() {
    return this.pressure / MACHINE.MAX_PRESSURE;
  }
  voltagePct() {
    return this.voltage / MACHINE.MAX_VOLTAGE;
  }

  reset() {
    this.heat = MACHINE.INITIAL_HEAT;
    this.voltage = MACHINE.INITIAL_VOLTAGE;
    this.pressure = 0;
    this.score = 0;
    this.shakePower = 0;
    this.tiltAngle = 0;
    this.flipTriggered = false;
    this.activeChaosEvent = null;
    this.chaosEndTime = 0;
    this.started = true;
    this.gameOver = false;
    this.deathReason = null;

    // Random machine type each run
    const types = Object.values(MACHINE_TYPES) as MachineType[];
    this.machineType = types[Math.floor(Math.random() * types.length)];
  }
}

export const gameState = new GameState();
