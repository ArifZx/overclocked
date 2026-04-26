// wavedash-achievement-system.ts

import type { WavedashSDK } from "@wvdsh/sdk-js";

type AchievementConfig = {
  id: string;
  type: "score" | "count";
  target: number;
  event?: string;
};

const ACHIEVEMENTS: AchievementConfig[] = [
  { id: "FIRST_GAME", type: "count", target: 1, event: "game_played" },
  { id: "PLAY_10", type: "count", target: 10, event: "game_played" },
  { id: "FIRST_MISTAKE", type: "count", target: 1, event: "mistake" },
];

type EventPayload = { value?: number };
type Listener = (payload?: EventPayload) => void;

class EventBus {
  private listeners: Record<string, Listener[]> = {};

  on(event: string, fn: Listener) {
    (this.listeners[event] ||= []).push(fn);
  }

  emit(event: string, payload?: EventPayload) {
    (this.listeners[event] || []).forEach((fn) => fn(payload));
  }
}

class AchievementQueue {
  private key = "wd_ach_queue";

  add(id: string) {
    const data = this.get();
    if (data.includes(id)) return;
    data.push(id);
    localStorage.setItem(this.key, JSON.stringify(data));
  }

  get(): string[] {
    return JSON.parse(localStorage.getItem(this.key) || "[]");
  }

  set(ids: string[]) {
    localStorage.setItem(this.key, JSON.stringify(ids));
  }

  clear() {
    localStorage.removeItem(this.key);
  }
}

class AchievementSystem {
  private static instance: AchievementSystem;
  private static readonly PROGRESS_KEY = "wd_ach_progress";
  private static readonly UNLOCKED_KEY = "wd_ach_unlocked";

  private bus = new EventBus();
  private queue = new AchievementQueue();
  private initialized = false;

  private progress: Record<string, number> = {};
  private unlocked = new Set<string>();

  static getInstance() {
    if (!this.instance) this.instance = new AchievementSystem();
    return this.instance;
  }

  init() {
    if (this.initialized) return;

    this.initialized = true;
    this.loadState();
    this.registerEvents();
    void this.syncQueue();
  }

  emit(event: string, payload?: EventPayload) {
    this.init();
    this.bus.emit(event, payload);
  }

  private registerEvents() {
    this.bus.on("game_played", () => {
      this.inc("game_played");
    });

    this.bus.on("mistake", () => {
      this.inc("mistake");
    });

    this.bus.on("score", (p) => {
      if (!p?.value) return;
      this.setScore(p.value);
    });
  }

  private inc(key: string) {
    this.progress[key] = (this.progress[key] || 0) + 1;
    this.saveState();
    this.check();
  }

  private setScore(value: number) {
    this.progress["score"] = Math.max(this.progress["score"] || 0, value);
    this.saveState();
    this.check();
  }

  private check() {
    for (const a of ACHIEVEMENTS) {
      if (this.unlocked.has(a.id)) continue;

      const val =
        a.type === "score" ? this.progress["score"] || 0 : this.progress[a.event || ""] || 0;

      if (val >= a.target) {
        void this.unlock(a.id);
      }
    }
  }

  private async unlock(id: string) {
    if (this.unlocked.has(id)) return;

    this.unlocked.add(id);
    this.saveState();
    this.queue.add(id);

    await this.push(id);
  }

  private loadState() {
    this.progress = JSON.parse(localStorage.getItem(AchievementSystem.PROGRESS_KEY) || "{}");

    const unlocked = JSON.parse(
      localStorage.getItem(AchievementSystem.UNLOCKED_KEY) || "[]",
    ) as string[];
    this.unlocked = new Set(unlocked);
  }

  private saveState() {
    localStorage.setItem(AchievementSystem.PROGRESS_KEY, JSON.stringify(this.progress));
    localStorage.setItem(AchievementSystem.UNLOCKED_KEY, JSON.stringify(Array.from(this.unlocked)));
  }

  private getWavedash(): WavedashSDK | null {
    if (typeof window === "undefined") {
      return null;
    }

    return (window as unknown as { Wavedash?: WavedashSDK }).Wavedash ?? null;
  }

  private async push(id: string) {
    const wd = this.getWavedash();

    if (wd === null) return;

    try {
      const alreadyUnlocked = wd.getAchievement(id);
      if (alreadyUnlocked) {
        return;
      }

      wd.setAchievement(id, true);
    } catch {
      // silent fail (offline / unsupported / error)
    }
  }

  private async syncQueue() {
    const wd = this.getWavedash();
    if (wd === null) return;

    const items = this.queue.get();
    const pending: string[] = [];

    for (const id of items) {
      try {
        if (!wd.getAchievement(id)) {
          wd.setAchievement(id, true);
        }
      } catch {
        pending.push(id);
      }
    }

    if (pending.length === 0) {
      this.queue.clear();
      return;
    }

    this.queue.set(pending);
  }
}

export const achievementSystem = AchievementSystem.getInstance();
