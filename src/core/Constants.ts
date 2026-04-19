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
  aggressive: { heatMult: 1.5, scoreMult: 2.0, chaosMult: 1.0, label: "😡 AGGRESSIVE" },
  stable: { heatMult: 0.6, scoreMult: 0.7, chaosMult: 1.0, label: "😴 STABLE" },
  chaotic: { heatMult: 1.0, scoreMult: 1.5, chaosMult: 0.5, label: "🤪 CHAOTIC" },
} as const;

// ─── Chaos events ─────────────────────────────────────────────────────────────
export const CHAOS = {
  MIN_INTERVAL_MS: 1_400,
  MAX_INTERVAL_MS: 4_000,
  MIN_WINDOW_MS: 800,
  MAX_WINDOW_MS: 3_000,
  WARNING_MS: 500,
};

export const CHAOS_EVENTS = [
  "heat_burst",
  "voltage_surge",
  "pressure_crash",
  "control_inversion",
  "phantom_alert",
] as const;

export type ChaosEventName = (typeof CHAOS_EVENTS)[number];

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
