import { CHAOS, CHAOS_EVENTS, MACHINE_TYPES } from "../core/Constants";
import type { ChaosEventName } from "../core/Constants";
import { gameState } from "../core/GameState";
import { EventBus, Events } from "../core/EventBus";

const CHAOS_LABELS: Record<ChaosEventName, string> = {
  fan_jam: "🔧 FAN JAM",
  voltage_spike: "⚡ VOLTAGE SPIKE",
  control_inversion: "🔄 CONTROL INVERSION",
  sensor_drift: "🧭 SENSOR DRIFT",
  phantom_shake: "📳 PHANTOM SHAKE",
  orientation_lock: "🧱 ORIENTATION LOCK",
};

export { CHAOS_LABELS };

export class ChaosSystem {
  private _nextEventTime = 0;
  private _gameStartTime = 0;

  start(nowMs: number) {
    this._gameStartTime = nowMs;
    this._scheduleNext(nowMs);
  }

  update(nowMs: number) {
    if (gameState.gameOver) return;

    // End active event
    if (gameState.activeChaosEvent !== null && nowMs >= gameState.chaosEndTime) {
      const ended = gameState.activeChaosEvent;
      gameState.activeChaosEvent = null;
      EventBus.emit(Events.CHAOS_END, { event: ended });
      this._scheduleNext(nowMs);
    }

    // Start new event
    if (gameState.activeChaosEvent === null && nowMs >= this._nextEventTime) {
      this._triggerEvent(nowMs);
    }
  }

  reset(nowMs: number) {
    gameState.activeChaosEvent = null;
    gameState.chaosEndTime = 0;
    this._gameStartTime = nowMs;
    this._scheduleNext(nowMs);
  }

  private _scheduleNext(nowMs: number) {
    const elapsed = (nowMs - this._gameStartTime) / 1000;
    // Interval shrinks as game goes on (minimum 5 s)
    const scalingFactor =
      elapsed > CHAOS.SCALING_START_S
        ? Math.pow(CHAOS.SCALING_FACTOR, (elapsed - CHAOS.SCALING_START_S) / 10)
        : 1;

    const chaosMult = gameState.machineType === MACHINE_TYPES.CHAOTIC ? 0.6 : 1;

    const minInterval = CHAOS.MIN_INTERVAL_MS * scalingFactor * chaosMult;
    const maxInterval = CHAOS.MAX_INTERVAL_MS * scalingFactor * chaosMult;
    const interval = minInterval + Math.random() * (maxInterval - minInterval);
    this._nextEventTime = nowMs + interval;
  }

  private _triggerEvent(nowMs: number) {
    const pick = CHAOS_EVENTS[Math.floor(Math.random() * CHAOS_EVENTS.length)];
    gameState.activeChaosEvent = pick;
    gameState.chaosEndTime = nowMs + CHAOS.DURATION_MS;
    EventBus.emit(Events.CHAOS_START, { event: pick });
    EventBus.emit(Events.SPECTACLE_HIT, { type: "chaos", event: pick });
  }
}
