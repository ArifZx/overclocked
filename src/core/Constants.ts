// ─── Canvas sizing ───────────────────────────────────────────────────────────
export const DPR = Math.min(window.devicePixelRatio || 1, 2);
const _isPortrait = window.innerHeight >= window.innerWidth;
const _designW = _isPortrait ? 540 : 960;
const _designH = _isPortrait ? 960 : 540;
const _designAspect = _designW / _designH;

const _deviceW = window.innerWidth * DPR;
const _deviceH = window.innerHeight * DPR;
let _canvasW: number;
let _canvasH: number;
if (_deviceW / _deviceH > _designAspect) {
  _canvasW = Math.round(_deviceH * _designAspect);
  _canvasH = _deviceH;
} else {
  _canvasW = _deviceW;
  _canvasH = Math.round(_deviceW / _designAspect);
}

/** Canvas pixels per design pixel — multiply all absolute sizes by PX */
export const PX = _canvasW / _designW;

function _readSafeInsets() {
  const s = getComputedStyle(document.documentElement);
  const top = parseInt(s.getPropertyValue("--ogp-safe-top-inset")) || 0;
  const bottom = parseInt(s.getPropertyValue("--ogp-safe-bottom-inset")) || 0;
  return { top: top * DPR, bottom: bottom * DPR };
}
const _insets = _readSafeInsets();

export const SAFE_ZONE = {
  TOP: Math.max(_canvasH * 0.08, _insets.top),
  BOTTOM: _insets.bottom,
};

// ─── Game canvas ─────────────────────────────────────────────────────────────
export const GAME = {
  WIDTH: _canvasW,
  HEIGHT: _canvasH,
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

export const LEVELS = {
  START: 1,
  MAX: 8,
  SCORE_STEP: 320,
  HEAT_GAIN_PER_LEVEL: 0.045,
  PRESSURE_GAIN_PER_LEVEL: 0.04,
  CHAOS_INTERVAL_SHRINK_PER_LEVEL: 0.045,
  CHAOS_WINDOW_SHRINK_PER_LEVEL: 0.03,
};

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
const _cx = _canvasW / 2;
const _safeTop = Math.max(_canvasH * 0.08, _insets.top);
const _usableH = _canvasH - _safeTop - _insets.bottom;

export const UI = {
  CX: _cx,
  SAFE_TOP: _safeTop,
  USABLE_H: _usableH,

  BAR_W: _canvasW * 0.76,
  BAR_H: 22 * PX,
  BAR_X: _canvasW * 0.12,
  BAR_CORNER: 6 * PX,

  LABEL_FS: `${Math.round(16 * PX)}px`,
  VALUE_FS: `${Math.round(13 * PX)}px`,
  SCORE_FS: `${Math.round(36 * PX)}px`,
  MACHINE_FS: `${Math.round(14 * PX)}px`,
  WARNING_FS: `${Math.round(20 * PX)}px`,
  CHAOS_FS: `${Math.round(16 * PX)}px`,

  PADDING: 16 * PX,
  SECTION_GAP: 14 * PX,

  /** Y positions as factions of usable height, from safe top */
  SCORE_Y_FRAC: 0.05,
  MACHINE_Y_FRAC: 0.11,
  HEAT_Y_FRAC: 0.22,
  VOLTAGE_Y_FRAC: 0.36,
  PRESSURE_Y_FRAC: 0.5,
  TILT_Y_FRAC: 0.64,
  WARNING_Y_FRAC: 0.75,
  TOUCH_Y_FRAC: 0.88,

  TILT_W: _canvasW * 0.7,
  TILT_H: 18 * PX,

  TOUCH_BTN_W: _canvasW * 0.22,
  TOUCH_BTN_H: 52 * PX,
  TOUCH_ALPHA: 0.45,
  TOUCH_ACTIVE_ALPHA: 0.85,

  FLIP_BTN_W: _canvasW * 0.35,
  FLIP_BTN_H: 48 * PX,
};
