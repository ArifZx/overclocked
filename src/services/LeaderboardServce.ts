type Tokens = {
  access: string;
  refresh: string;
};

type ScoreEntry = {
  rank: number;
  score: number;
  player?: string;
};

export class LeaderboardService {
  private tokens: Tokens | null = null;
  private initializing: Promise<void> | null = null;

  // =========================
  // INIT
  // =========================
  async init() {
    if (this.initializing) return this.initializing;

    this.initializing = (async () => {
      if (this.isWavedash()) {
        await this.waitForWavedash();
        return;
      }

      await this.startSession();
    })();

    return this.initializing;
  }

  // =========================
  // PUBLIC API
  // =========================
  async submitScore(score: number) {
    await this.init();

    if (this.isWavedash()) {
      return this.submitWavedash(score);
    }

    // Get nonce
    const nonceRes = await this.authFetch("https://api.leadr.gg/v1/client/nonce");
    const { nonce } = await nonceRes.json();

    // Submit score
    return this.authFetch("https://api.leadr.gg/v1/client/scores", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "leadr-client-nonce": nonce,
      },
      body: JSON.stringify({ score }),
    });
  }

  async getLeaderboard(limit = 10): Promise<ScoreEntry[]> {
    await this.init();

    if (this.isWavedash()) {
      return this.getWavedashLeaderboard(limit);
    }

    const res = await this.authFetch(`https://api.leadr.gg/v1/client/scores?limit=${limit}`);

    const data = await res.json();

    return data.scores.map((s: any, i: number) => ({
      rank: i + 1,
      score: s.score,
      player: s.player ?? "anon",
    }));
  }

  // =========================
  // AUTH (LEADR)
  // =========================
  private async startSession() {
    const fingerprint = await this.getFingerprint();

    const res = await fetch("https://api.leadr.gg/v1/client/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        game_id: "gam_72859e50-1fa0-4ec0-a4ed-da067139359c",
        client_fingerprint: fingerprint,
      }),
    });

    if (!res.ok) throw new Error("Failed to create Leadr session");

    const data = await res.json();

    this.tokens = {
      access: data.access_token,
      refresh: data.refresh_token,
    };
  }

  private async refreshSession() {
    if (!this.tokens) throw new Error("No refresh token");

    const res = await fetch("https://api.leadr.gg/v1/client/sessions/refresh", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.tokens.refresh}`,
      },
    });

    // If refresh fails → restart session
    if (!res.ok) {
      await this.startSession();
      return;
    }

    const data = await res.json();

    // 🔥 Token rotation (important)
    this.tokens = {
      access: data.access_token,
      refresh: data.refresh_token,
    };
  }

  // 🔑 Auth wrapper (auto refresh + retry)
  private async authFetch(url: string, options: RequestInit = {}) {
    if (!this.tokens) {
      await this.startSession();
    }

    const makeHeaders = () => {
      const headers = new Headers(options.headers);
      headers.set("Authorization", `Bearer ${this.tokens!.access}`);
      return headers;
    };

    let res = await fetch(url, {
      ...options,
      headers: makeHeaders(),
    });

    // Auto refresh on 401
    if (res.status === 401) {
      await this.refreshSession();

      res = await fetch(url, {
        ...options,
        headers: makeHeaders(),
      });
    }

    return res;
  }

  // =========================
  // WAVEDASH
  // =========================
  private isWavedash(): boolean {
    return typeof window !== "undefined" && "WavedashJS" in window;
  }

  private async waitForWavedash(timeout = 2000) {
    const start = Date.now();

    while (!this.isWavedash()) {
      if (Date.now() - start > timeout) return;
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  private async submitWavedash(score: number) {
    const WavedashJS = (window as any).WavedashJS;

    const leaderboard = await WavedashJS.getLeaderboard("high-scores");

    return WavedashJS.uploadLeaderboardScore(leaderboard.data.id, score, true);
  }

  private async getWavedashLeaderboard(limit: number): Promise<ScoreEntry[]> {
    const WavedashJS = (window as any).WavedashJS;

    const leaderboard = await WavedashJS.getLeaderboard("high-scores");

    const entries = await WavedashJS.getLeaderboardEntries(leaderboard.data.id, { limit });

    return entries.data.map((e: any, i: number) => ({
      rank: i + 1,
      score: e.score,
      player: e.user?.username,
    }));
  }

  // =========================
  // FINGERPRINT (SHA-256)
  // =========================
  private async getFingerprint(): Promise<string> {
    const key = "leadr_fp";

    let fp = localStorage.getItem(key);
    if (fp) return fp;

    const raw = [crypto.randomUUID(), navigator.userAgent, screen.width, screen.height].join("|");

    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));

    console.log("Raw fingerprint data:", raw, hash);

    fp = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    localStorage.setItem(key, fp);

    return fp;
  }
}

export const leaderboardService = new LeaderboardService();
