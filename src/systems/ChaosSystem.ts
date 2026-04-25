import { CHAOS, CHAOS_EVENTS, getLevelConfig, MACHINE_TYPES } from "../core/Constants";
import type { ChaosEventName } from "../core/Constants";
import { gameState } from "../core/GameState";
import { EventBus, Events } from "../core/EventBus";

const CHAOS_LABELS: Record<ChaosEventName, string> = {
  heat_burst: "🔥 HEAT BURST",
  voltage_surge: "⚡ VOLTAGE SURGE",
  pressure_crash: "💨 PRESSURE CRASH",
  control_inversion: "🔄 CONTROL INVERSION",
  phantom_alert: "📳 PHANTOM ALERT",
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
    const elapsed = Math.max(0, (nowMs - this._gameStartTime) / 1000);
    const ramp = Math.min(1, elapsed / 60);
    const baseMin = CHAOS.MAX_INTERVAL_MS + (CHAOS.MIN_INTERVAL_MS - CHAOS.MAX_INTERVAL_MS) * ramp;
    const baseMax =
      CHAOS.MAX_INTERVAL_MS + (CHAOS.MIN_INTERVAL_MS * 1.6 - CHAOS.MAX_INTERVAL_MS) * ramp;
    const levelConfig = getLevelConfig(gameState.level);

    const chaosMult = gameState.machineType === MACHINE_TYPES.CHAOTIC ? 0.6 : 1;
    const levelIntervalScale = levelConfig.chaosIntervalMult;

    const minInterval = Math.max(700, baseMin * chaosMult * levelIntervalScale);
    const maxInterval = Math.max(minInterval + 200, baseMax * chaosMult * levelIntervalScale);
    const interval = minInterval + Math.random() * (maxInterval - minInterval);
    this._nextEventTime = nowMs + interval;
  }

  private _triggerEvent(nowMs: number) {
    const elapsed = Math.max(0, (nowMs - this._gameStartTime) / 1000);
    const ramp = Math.min(1, elapsed / 60);
    const windowMin = CHAOS.MAX_WINDOW_MS + (CHAOS.MIN_WINDOW_MS - CHAOS.MAX_WINDOW_MS) * ramp;
    const windowMax =
      CHAOS.MAX_WINDOW_MS + (CHAOS.MIN_WINDOW_MS * 1.45 - CHAOS.MAX_WINDOW_MS) * ramp;
    const levelConfig = getLevelConfig(gameState.level);
    const levelWindowScale = levelConfig.chaosWindowMult;
    const reactionWindow = (windowMin + Math.random() * (windowMax - windowMin)) * levelWindowScale;

    const pick = CHAOS_EVENTS[Math.floor(Math.random() * CHAOS_EVENTS.length)];
    gameState.activeChaosEvent = pick;
    gameState.chaosEndTime = nowMs + reactionWindow;
    EventBus.emit(Events.CHAOS_START, { event: pick });
    EventBus.emit(Events.SPECTACLE_HIT, { type: "chaos", event: pick });
  }
}
