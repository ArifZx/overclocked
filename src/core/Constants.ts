// ─── Canvas sizing ───────────────────────────────────────────────────────────
export const DPR = Math.min(window.devicePixelRatio || 1, 2);
const _baseW = 540;
const _baseH = 960;

export const GAME = {
  WIDTH: window.innerWidth,
  HEIGHT: window.innerHeight,
};

/** Canvas pixels per design pixel — multiply all absolute sizes by PX */
export const PX = Math.min(GAME.WIDTH / _baseW, GAME.HEIGHT / _baseH) || 1;

function _readSafeInsets() {
  const s = getComputedStyle(document.documentElement);
  const top = parseInt(s.getPropertyValue("--ogp-safe-top-inset")) || 0;
  const bottom = parseInt(s.getPropertyValue("--ogp-safe-bottom-inset")) || 0;
  return {
    top,
    bottom,
  };
}
const _insets = _readSafeInsets();

export const SAFE_ZONE = {
  TOP: Math.max(GAME.HEIGHT * 0.08, _insets.top),
  BOTTOM: _insets.bottom,
};

// ─── Color palette ───────────────────────────────────────────────────────────
export const PALETTE = {
  BG: 0x06060c,
  PANEL: 0x0e0e1c,
  PANEL_BORDER: 0x1e2040,
  GRID: 0x0d1028,

  HEAT: 0xff3333,
  HEAT_LOW: 0xff8800,
  HEAT_MID: 0xff5500,

  VOLTAGE: 0x00d4ff,
  VOLTAGE_LOW: 0x0066aa,

  PRESSURE: 0x44ff88,
  PRESSURE_HIGH: 0xff44aa,

  DANGER: 0xff6600,
  CRITICAL: 0xff0000,
  WARNING: 0xffcc00,

  TEXT: "#e0e0ff",
  TEXT_DIM: "#7080a0",
  TEXT_HEX: 0xe0e0ff,
  TEXT_DIM_HEX: 0x7080a0,

  WHITE: 0xffffff,
  BAR_BG: 0x141428,
  GLOW: 0x4466ff,

  MELTDOWN: 0xff2200,
  EXPLOSION: 0x00ff88,
};

// ─── Machine simulation ───────────────────────────────────────────────────────
export const MACHINE = {
  MAX_HEAT: 100,
  MAX_PRESSURE: 100,
  MIN_VOLTAGE: 0,
  MAX_VOLTAGE: 100,
  INITIAL_HEAT: 20,
  INITIAL_VOLTAGE: 50,

  /** heat += voltage * HEAT_RATE * dt  (dt in seconds) */
  HEAT_RATE: 0.06,
  /** passive heat loss per second */
  PASSIVE_COOLING: 0.8,
  /** pressure gain range per second */
  PRESSURE_MIN: 0.8,
  PRESSURE_MAX: 2.5,
  /** passive pressure loss per second */
  PRESSURE_PASSIVE_VENT: 1.1,
  /** extra venting when the player leans into the safe side */
  PRESSURE_SAFE_VENT_BONUS: 1.8,
  /** extra buildup when the player drives voltage aggressively */
  PRESSURE_RISK_GAIN: 2.2,

  /** degrees of gamma tilt = full voltage range */
  TILT_SENSITIVITY: 35,
  /** m/s² threshold to detect a shake */
  SHAKE_THRESHOLD: 12,
  /** shake power decay multiplier per frame */
  SHAKE_POWER_DECAY: 0.88,
  /** max accumulated shake power */
  MAX_SHAKE_POWER: 40,
  /** heat -= shakePower * rate * dt */
  SHAKE_COOLING_RATE: 0.4,
  /** instability penalty when shake power is too high */
  SHAKE_INSTABILITY_THRESHOLD: 30,
  SHAKE_HEAT_PENALTY: 0.5,

  /** beta degrees at which flip is detected */
  FLIP_BETA_THRESHOLD: 130,
  /** how long flip effect lasts (ms) */
  FLIP_DURATION: 800,

  /** desktop keyboard tilt delta per frame */
  KEYBOARD_TILT_STEP: 3.8,
  /** desktop keyboard shake impulse */
  KEYBOARD_SHAKE_POWER: 14,
};

// ─── Machine personality types ────────────────────────────────────────────────
export const MACHINE_TYPES = {
  AGGRESSIVE: "aggressive",
  STABLE: "stable",
  CHAOTIC: "chaotic",
} as const;

export const MACHINE_CONFIGS = {
  aggressive: {
    heatMult: 1.5,
    scoreMult: 2.0,
    chaosMult: 1.0,
    label: "😡 AGGRESSIVE",
  },
  stable: { heatMult: 0.6, scoreMult: 0.7, chaosMult: 1.0, label: "😴 STABLE" },
  chaotic: {
    heatMult: 1.0,
    scoreMult: 1.5,
    chaosMult: 0.5,
    label: "🤪 CHAOTIC",
  },
} as const;

// ─── Chaos events ─────────────────────────────────────────────────────────────
export const CHAOS = {
  MIN_INTERVAL_MS: 1_800,
  MAX_INTERVAL_MS: 4_600,
  MIN_WINDOW_MS: 1_100,
  MAX_WINDOW_MS: 3_400,
  WARNING_MS: 500,
};

export type LevelObjective = {
  surviveMs: number;
  maxHeatPct?: number;
  maxPressurePct?: number;
};

export type LevelConfig = {
  level: number;
  label: string;
  briefing: string;
  objective: LevelObjective | null;
  heatGainMult: number;
  pressureGainMult: number;
  chaosIntervalMult: number;
  chaosWindowMult: number;
  endless?: boolean;
};

export const LEVELS = {
  START: 1,
  CAMPAIGN_LAST: 5,
  ENDLESS: 6,
  MAX: 6,
};

export const LEVEL_CONFIGS: Record<number, LevelConfig> = {
  1: {
    level: 1,
    label: "BOOT SEQUENCE",
    briefing: "SURVIVE 18S // STABILIZE THE LINK",
    objective: { surviveMs: 18_000 },
    heatGainMult: 1,
    pressureGainMult: 1,
    chaosIntervalMult: 1.08,
    chaosWindowMult: 1.08,
  },
  2: {
    level: 2,
    label: "COOLANT WATCH",
    briefing: "HOLD HEAT <82% FOR 20S",
    objective: { surviveMs: 20_000, maxHeatPct: 0.82 },
    heatGainMult: 1.08,
    pressureGainMult: 1.04,
    chaosIntervalMult: 0.96,
    chaosWindowMult: 0.95,
  },
  3: {
    level: 3,
    label: "PRESSURE LOCK",
    briefing: "HOLD PRESSURE <72% FOR 22S",
    objective: { surviveMs: 22_000, maxPressurePct: 0.72 },
    heatGainMult: 1.12,
    pressureGainMult: 1.14,
    chaosIntervalMult: 0.92,
    chaosWindowMult: 0.9,
  },
  4: {
    level: 4,
    label: "DUAL SYNC",
    briefing: "HOLD HEAT <80% AND PRESSURE <78% FOR 26S",
    objective: { surviveMs: 26_000, maxHeatPct: 0.8, maxPressurePct: 0.78 },
    heatGainMult: 1.18,
    pressureGainMult: 1.18,
    chaosIntervalMult: 0.88,
    chaosWindowMult: 0.86,
  },
  5: {
    level: 5,
    label: "CORE REDLINE",
    briefing: "HOLD HEAT <76% AND PRESSURE <74% FOR 30S",
    objective: { surviveMs: 30_000, maxHeatPct: 0.76, maxPressurePct: 0.74 },
    heatGainMult: 1.26,
    pressureGainMult: 1.24,
    chaosIntervalMult: 0.82,
    chaosWindowMult: 0.8,
  },
  6: {
    level: 6,
    label: "ENDLESS",
    briefing: "ENDLESS // NO SAFE SHUTDOWN",
    objective: null,
    heatGainMult: 1.34,
    pressureGainMult: 1.32,
    chaosIntervalMult: 0.76,
    chaosWindowMult: 0.74,
    endless: true,
  },
};

export function getLevelConfig(level: number): LevelConfig {
  const resolved = Math.max(LEVELS.START, Math.min(level, LEVELS.ENDLESS));
  return LEVEL_CONFIGS[resolved] ?? LEVEL_CONFIGS[LEVELS.ENDLESS];
}

export function getLevelLabel(level: number) {
  return level >= LEVELS.ENDLESS ? "ENDLESS" : `LEVEL ${level}`;
}

export const CHAOS_EVENTS = [
  "heat_burst",
  "voltage_surge",
  "pressure_crash",
  "control_inversion",
  "phantom_alert",
] as const;

export type ChaosEventName = (typeof CHAOS_EVENTS)[number];

export type MachineCommPulse = {
  at: number;
  rate: number;
  detune: number;
  volume: number;
};

export type MachineCommSignal = {
  text: string;
  color: string;
  pulses: readonly MachineCommPulse[];
};

export type MachineMusicStep = MachineCommPulse & {
  chance?: number;
  detuneJitter?: number;
  rateJitter?: number;
  harmony?: readonly MachineMusicHarmonyVoice[];
};

export type MachineMusicHarmonyVoice = {
  detune: number;
  volume: number;
  rate?: number;
};

export type MachineMusicTrack = {
  loopMs: number;
  steps: readonly MachineMusicStep[];
};

export const MACHINE_COMMS = {
  IDLE_TEXT: "SYS READY // HOLD THE LINE",
  IDLE_COLOR: "#7dc8ff",
  STARTUP: {
    text: "LINK OK // AUDIO ENCODER ONLINE",
    color: "#b2f1ff",
    pulses: [
      { at: 0, rate: 1.08, detune: 180, volume: 0.2 },
      { at: 140, rate: 1.16, detune: 320, volume: 0.16 },
      { at: 320, rate: 0.92, detune: -120, volume: 0.18 },
    ],
  },
  SUCCESS: {
    text: "WINDOW CLOSED // SYSTEM STABLE",
    color: "#85ffb3",
    pulses: [
      { at: 0, rate: 1.12, detune: 220, volume: 0.18 },
      { at: 120, rate: 1.2, detune: 380, volume: 0.16 },
    ],
  },
  CONGRATS: {
    text: "STAGE CLEAR // LINK STABLE",
    color: "#a5ffd2",
    pulses: [
      { at: 0, rate: 1.02, detune: 120, volume: 0.16 },
      { at: 130, rate: 1.14, detune: 320, volume: 0.17 },
      { at: 280, rate: 1.28, detune: 540, volume: 0.18 },
      { at: 450, rate: 1.16, detune: 420, volume: 0.14 },
    ],
  },
  FAIL: {
    timeout: {
      text: "NO INPUT // DAMAGE REGISTERED",
      color: "#ff8c7a",
      pulses: [
        { at: 0, rate: 0.86, detune: -260, volume: 0.2 },
        { at: 220, rate: 0.82, detune: -340, volume: 0.2 },
      ],
    },
    baited: {
      text: "FALSE POSITIVE // PANIC DETECTED",
      color: "#ff9f73",
      pulses: [
        { at: 0, rate: 1.18, detune: 260, volume: 0.18 },
        { at: 110, rate: 1.02, detune: 20, volume: 0.16 },
        { at: 260, rate: 0.84, detune: -300, volume: 0.18 },
      ],
    },
  },
  GAME_OVER: {
    meltdown: {
      text: "THERMAL FAIL // MELTDOWN CONFIRMED",
      color: "#ff5c5c",
      pulses: [
        { at: 0, rate: 0.86, detune: -180, volume: 0.22 },
        { at: 200, rate: 0.8, detune: -320, volume: 0.22 },
        { at: 460, rate: 0.72, detune: -420, volume: 0.24 },
      ],
    },
    explosion: {
      text: "PRESSURE FAIL // CORE BREACH",
      color: "#8fffc0",
      pulses: [
        { at: 0, rate: 0.82, detune: -300, volume: 0.22 },
        { at: 170, rate: 1.04, detune: 120, volume: 0.18 },
        { at: 360, rate: 0.7, detune: -460, volume: 0.24 },
      ],
    },
  },
  EVENTS: {
    heat_burst: {
      text: "THERMAL SPIKE // SHAKE TO PURGE",
      color: "#ffad6b",
      pulses: [
        { at: 0, rate: 1.2, detune: 260, volume: 0.18 },
        { at: 90, rate: 1.16, detune: 220, volume: 0.18 },
        { at: 180, rate: 1.1, detune: 140, volume: 0.18 },
      ],
    },
    voltage_surge: {
      text: "VOLTAGE DRIFT // TILT WITH FLOW",
      color: "#7ddaff",
      pulses: [
        { at: 0, rate: 0.98, detune: -40, volume: 0.16 },
        { at: 140, rate: 1.08, detune: 180, volume: 0.18 },
        { at: 280, rate: 1.18, detune: 360, volume: 0.2 },
      ],
    },
    pressure_crash: {
      text: "PRESSURE DROP // FLIP TO VENT",
      color: "#93ffc5",
      pulses: [
        { at: 0, rate: 0.84, detune: -240, volume: 0.22 },
        { at: 220, rate: 0.8, detune: -320, volume: 0.22 },
      ],
    },
    control_inversion: {
      text: "CONTROL MAP FLIPPED // COUNTER-TILT",
      color: "#ffe48a",
      pulses: [
        { at: 0, rate: 1.18, detune: 340, volume: 0.18 },
        { at: 110, rate: 0.86, detune: -220, volume: 0.18 },
        { at: 220, rate: 1.18, detune: 340, volume: 0.18 },
      ],
    },
    phantom_alert: {
      text: "PHANTOM SIGNAL // HOLD STEADY",
      color: "#d4b2ff",
      pulses: [
        { at: 0, rate: 1.16, detune: 260, volume: 0.16 },
        { at: 180, rate: 0.96, detune: -60, volume: 0.12 },
      ],
    },
  },
} satisfies {
  IDLE_TEXT: string;
  IDLE_COLOR: string;
  STARTUP: MachineCommSignal;
  SUCCESS: MachineCommSignal;
  CONGRATS: MachineCommSignal;
  FAIL: Record<"timeout" | "baited", MachineCommSignal>;
  GAME_OVER: Record<"meltdown" | "explosion", MachineCommSignal>;
  EVENTS: Record<ChaosEventName, MachineCommSignal>;
};

export const MACHINE_MUSIC = {
  landing: {
    loopMs: 5_200,
    steps: [
      {
        at: 0,
        rate: 0.94,
        detune: -120,
        volume: 0.095,
        harmony: [
          { detune: 320, volume: 0.03, rate: 1.02 },
          { detune: 700, volume: 0.022, rate: 1.1 },
        ],
      },
      {
        at: 240,
        rate: 1.08,
        detune: 80,
        volume: 0.105,
        harmony: [{ detune: 700, volume: 0.024, rate: 1.16 }],
      },
      {
        at: 480,
        rate: 1.2,
        detune: 260,
        volume: 0.11,
        harmony: [
          { detune: 380, volume: 0.034, rate: 1.28 },
          { detune: 700, volume: 0.022, rate: 1.34 },
        ],
      },
      {
        at: 760,
        rate: 1,
        detune: 20,
        volume: 0.09,
        harmony: [{ detune: 320, volume: 0.03, rate: 1.08 }],
      },
      {
        at: 1_040,
        rate: 0.94,
        detune: -120,
        volume: 0.09,
        harmony: [
          { detune: 320, volume: 0.03, rate: 1.02 },
          { detune: 700, volume: 0.022, rate: 1.1 },
        ],
      },
      {
        at: 1_280,
        rate: 1.08,
        detune: 80,
        volume: 0.105,
        harmony: [{ detune: 700, volume: 0.024, rate: 1.16 }],
      },
      {
        at: 1_520,
        rate: 1.2,
        detune: 260,
        volume: 0.11,
        harmony: [
          { detune: 380, volume: 0.034, rate: 1.28 },
          { detune: 700, volume: 0.022, rate: 1.34 },
        ],
      },
      {
        at: 1_800,
        rate: 1.28,
        detune: 420,
        volume: 0.095,
        harmony: [{ detune: 700, volume: 0.024, rate: 1.36 }],
      },
      {
        at: 2_180,
        rate: 0.9,
        detune: -220,
        volume: 0.08,
        harmony: [{ detune: 500, volume: 0.024, rate: 0.98 }],
      },
      {
        at: 2_480,
        rate: 1.04,
        detune: 40,
        volume: 0.092,
        harmony: [
          { detune: 320, volume: 0.028, rate: 1.12 },
          { detune: 700, volume: 0.018, rate: 1.2 },
        ],
      },
      {
        at: 2_760,
        rate: 1.16,
        detune: 220,
        volume: 0.1,
        harmony: [{ detune: 700, volume: 0.024, rate: 1.24 }],
      },
      {
        at: 3_000,
        rate: 1.28,
        detune: 420,
        volume: 0.105,
        harmony: [
          { detune: 320, volume: 0.03, rate: 1.34 },
          { detune: 700, volume: 0.02, rate: 1.42 },
        ],
      },
      { at: 3_320, rate: 0.92, detune: -140, volume: 0.08, detuneJitter: 18 },
      { at: 3_600, rate: 1.22, detune: 300, volume: 0.09, chance: 0.85 },
      { at: 3_860, rate: 1.34, detune: 520, volume: 0.08, chance: 0.7 },
      {
        at: 4_180,
        rate: 0.96,
        detune: -40,
        volume: 0.085,
        harmony: [{ detune: 700, volume: 0.02, rate: 1.04 }],
      },
      {
        at: 4_520,
        rate: 1.12,
        detune: 180,
        volume: 0.095,
        harmony: [{ detune: 320, volume: 0.026, rate: 1.2 }],
      },
      {
        at: 4_760,
        rate: 1.28,
        detune: 420,
        volume: 0.1,
        harmony: [{ detune: 700, volume: 0.022, rate: 1.36 }],
      },
    ],
  },
  game: {
    loopMs: 3_200,
    steps: [
      {
        at: 0,
        rate: 1,
        detune: 20,
        volume: 0.09,
        harmony: [{ detune: 700, volume: 0.02, rate: 1.08 }],
      },
      {
        at: 180,
        rate: 1.14,
        detune: 220,
        volume: 0.075,
        harmony: [{ detune: 320, volume: 0.022, rate: 1.2 }],
      },
      {
        at: 360,
        rate: 1.28,
        detune: 420,
        volume: 0.065,
        harmony: [
          { detune: 320, volume: 0.02, rate: 1.34 },
          { detune: 700, volume: 0.014, rate: 1.42 },
        ],
      },
      {
        at: 560,
        rate: 1.04,
        detune: 80,
        volume: 0.085,
        harmony: [{ detune: 700, volume: 0.018, rate: 1.12 }],
      },
      {
        at: 860,
        rate: 1,
        detune: 20,
        volume: 0.09,
        harmony: [{ detune: 700, volume: 0.02, rate: 1.08 }],
      },
      {
        at: 1_040,
        rate: 1.14,
        detune: 220,
        volume: 0.075,
        harmony: [{ detune: 320, volume: 0.022, rate: 1.2 }],
      },
      {
        at: 1_220,
        rate: 1.28,
        detune: 420,
        volume: 0.065,
        harmony: [
          { detune: 320, volume: 0.02, rate: 1.34 },
          { detune: 700, volume: 0.014, rate: 1.42 },
        ],
      },
      {
        at: 1_420,
        rate: 0.96,
        detune: -100,
        volume: 0.08,
        harmony: [{ detune: 320, volume: 0.018, rate: 1.04 }],
      },
      {
        at: 1_600,
        rate: 0.88,
        detune: -260,
        volume: 0.09,
        harmony: [{ detune: 500, volume: 0.016, rate: 0.96 }],
      },
      { at: 1_760, rate: 1.22, detune: 320, volume: 0.065, chance: 0.8 },
      { at: 1_940, rate: 1.34, detune: 520, volume: 0.055, chance: 0.65 },
      {
        at: 2_120,
        rate: 1,
        detune: 20,
        volume: 0.088,
        harmony: [{ detune: 700, volume: 0.02, rate: 1.08 }],
      },
      {
        at: 2_300,
        rate: 1.14,
        detune: 220,
        volume: 0.072,
        harmony: [{ detune: 320, volume: 0.02, rate: 1.2 }],
      },
      {
        at: 2_480,
        rate: 1.28,
        detune: 420,
        volume: 0.064,
        harmony: [{ detune: 700, volume: 0.014, rate: 1.4 }],
      },
      { at: 2_700, rate: 0.92, detune: -140, volume: 0.078, detuneJitter: 22 },
      { at: 2_880, rate: 1.2, detune: 300, volume: 0.062, chance: 0.85 },
      { at: 3_040, rate: 1.32, detune: 500, volume: 0.052, chance: 0.7 },
    ],
  },
  game_over: {
    loopMs: 4_200,
    steps: [
      {
        at: 0,
        rate: 0.78,
        detune: -420,
        volume: 0.11,
        harmony: [{ detune: 620, volume: 0.018, rate: 0.84 }],
      },
      { at: 420, rate: 0.82, detune: -320, volume: 0.1 },
      { at: 960, rate: 0.88, detune: -180, volume: 0.08 },
      { at: 1_280, rate: 1, detune: 20, volume: 0.05, chance: 0.7 },
      {
        at: 1_620,
        rate: 0.74,
        detune: -520,
        volume: 0.12,
        harmony: [{ detune: 700, volume: 0.016, rate: 0.8 }],
      },
      { at: 2_040, rate: 0.84, detune: -300, volume: 0.09, detuneJitter: 18 },
      { at: 2_380, rate: 1.06, detune: 120, volume: 0.05, chance: 0.55 },
      { at: 2_760, rate: 0.8, detune: -360, volume: 0.1 },
      { at: 3_060, rate: 0.92, detune: -80, volume: 0.07, chance: 0.65 },
      { at: 3_420, rate: 0.7, detune: -620, volume: 0.12 },
      { at: 3_760, rate: 1.12, detune: 220, volume: 0.04, chance: 0.4 },
    ],
  },
} satisfies Record<"landing" | "game" | "game_over", MachineMusicTrack>;

// ─── UI layout ────────────────────────────────────────────────────────────────
const _cx = GAME.WIDTH / 2;
const _safeTop = Math.max(GAME.HEIGHT * 0.08, _insets.top);
const _usableH = GAME.HEIGHT - _safeTop - _insets.bottom;
const _contentW = Math.min(GAME.WIDTH * 0.76, 640 * PX);
const _touchBtnW = Math.min(GAME.WIDTH * 0.22, 170 * PX);
const _flipBtnW = Math.min(GAME.WIDTH * 0.35, 250 * PX);
const _isCompactH = GAME.HEIGHT <= 700;
const _valueFont = Math.round((_isCompactH ? 12 : 13) * PX);
const _chaosFont = Math.round((_isCompactH ? 14 : 16) * PX);
const _warningFont = Math.round((_isCompactH ? 17 : 20) * PX);

export const UI = {
  IS_COMPACT_H: _isCompactH,
  CX: _cx,
  SAFE_TOP: _safeTop,
  USABLE_H: _usableH,
  CONTENT_W: _contentW,
  CONTENT_X: _cx - _contentW / 2,

  BAR_W: _contentW,
  BAR_H: 22 * PX,
  BAR_X: _cx - _contentW / 2,
  BAR_CORNER: 6 * PX,

  LABEL_FS: `${Math.round(16 * PX)}px`,
  VALUE_FS: `${Math.max(11, _valueFont)}px`,
  SCORE_FS: `${Math.round(36 * PX)}px`,
  MACHINE_FS: `${Math.round(14 * PX)}px`,
  WARNING_FS: `${Math.max(14, _warningFont)}px`,
  CHAOS_FS: `${Math.max(12, _chaosFont)}px`,

  PADDING: 16 * PX,
  SECTION_GAP: 14 * PX,
  CHAOS_GAP: (_isCompactH ? 20 : 30) * PX,

  /** Y positions as factions of usable height, from safe top */
  SCORE_Y_FRAC: 0.05,
  MACHINE_Y_FRAC: 0.11,
  COMMS_TITLE_Y_FRAC: _isCompactH ? 0.17 : 0.19,
  COMMS_TEXT_Y_FRAC: _isCompactH ? 0.2 : 0.22,
  HEAT_Y_FRAC: _isCompactH ? 0.24 : 0.255,
  VOLTAGE_Y_FRAC: _isCompactH ? 0.355 : 0.375,
  PRESSURE_Y_FRAC: _isCompactH ? 0.47 : 0.495,
  TILT_Y_FRAC: 0.64,
  WARNING_Y_FRAC: _isCompactH ? 0.71 : 0.75,
  ATTACK_Y_FRAC: _isCompactH ? 0.765 : 0.81,
  ATTACK_TIMER_Y_FRAC: _isCompactH ? 0.805 : 0.85,
  TOUCH_Y_FRAC: _isCompactH ? 0.895 : 0.88,

  TILT_W: Math.min(GAME.WIDTH * 0.7, _contentW * 0.92),
  TILT_H: 18 * PX,

  TOUCH_BTN_W: _touchBtnW,
  TOUCH_BTN_H: Math.max(34, (_isCompactH ? 44 : 52) * PX),
  TOUCH_ALPHA: 0.78,
  TOUCH_ACTIVE_ALPHA: 0.96,

  FLIP_BTN_W: _flipBtnW,
  FLIP_BTN_H: Math.max(32, (_isCompactH ? 40 : 48) * PX),
};
