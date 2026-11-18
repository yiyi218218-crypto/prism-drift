// Every tuning number and colour of PRISM DRIFT in one place. The playfield is a fixed
// 1280x720 logical area and the renderer scales it to the window, so no rule depends on
// the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The three light lanes, top to bottom. A player sits on one and may hop between them. */
export const LANES = [238, 360, 482];

export const PLAYER = {
  x: 210,
  width: 62,
  height: 46,
  /** Seconds a hop between two lanes takes. */
  hopTime: 0.11,
  invulnerable: 1.6,
  /** Seconds of trail kept behind the ship. */
  trailSeconds: 0.45,
};

export const LIVES = 3;

/**
 * The three prism colours. A gate of a colour opens only for a ship of the same colour;
 * a ship of another colour breaks on it. `glow` is the soft halo, `core` the solid line.
 */
export const COLORS = [
  { name: 'CYAN', core: '#3ff5ff', glow: 'rgba(63,245,255,0.55)', dim: '#0d5f6b' },
  { name: 'MAGENTA', core: '#ff4fd8', glow: 'rgba(255,79,216,0.55)', dim: '#6b0d58' },
  { name: 'AMBER', core: '#ffc23f', glow: 'rgba(255,194,63,0.55)', dim: '#6b4a0d' },
];

/** A gate is a pair of posts with a light curtain between them, one lane tall. */
export const GATE = {
  width: 46,
  /** World units a second at the start, growing with distance. */
  speed: 300,
  speedPerThousand: 26,
  maxSpeed: 720,
  /** Seconds between gates at the start, shrinking as the run goes on. */
  interval: 1.35,
  minInterval: 0.72,
  intervalScale: 0.985,
  /** Points for passing a gate of the ship's own colour. */
  passPoints: 12,
};

/** A crystal is a free pickup worth points and a little time. */
export const CRYSTAL = {
  size: 18,
  interval: 1.9,
  jitter: 1.1,
  points: 25,
};

/** The run gets faster for its first two minutes, then holds. */
export const RAMP_SECONDS = 120;

export const BEST_KEY = 'prism-drift-best';
