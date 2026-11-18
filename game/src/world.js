// The rules of PRISM DRIFT, with no drawing in them. A ship flies down three light lanes
// toward gates of three prism colours; a gate opens only for a ship of its own colour, and
// a ship of another colour breaks on it. Crystals are free points. The run ends when the
// last life is gone.
//
// Everything here is a pure function of the state and the step, so a seeded run replays
// exactly and the screenshot scenes are the real rules played forward.

import {
  COLORS,
  CRYSTAL,
  FIELD,
  GATE,
  LANES,
  LIVES,
  PLAYER,
  RAMP_SECONDS,
  STEP,
} from './config.js';
import { pick } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_PASS = 1;
export const EVENT_HIT = 2;
export const EVENT_PICK = 4;
export const EVENT_OVER = 8;

/** A ship is a point on a lane that hops between lanes and changes prism colour. */
function makePlayer() {
  return {
    lane: 1,
    y: LANES[1],
    fromY: LANES[1],
    hop: 1,
    color: 0,
    invulnerable: 0,
    trail: [],
  };
}

export function createWorld(random) {
  const state = {
    player: makePlayer(),
    gates: [],
    crystals: [],
    particles: [],
    score: 0,
    lives: LIVES,
    distance: 0,
    elapsed: 0,
    speed: GATE.speed,
    spawnTimer: 0.9,
    crystalTimer: 1.4,
    interval: GATE.interval,
    combo: 0,
    bestCombo: 0,
    over: false,
    flash: 0,
    gateCount: 0,
  };

  function reset() {
    state.player = makePlayer();
    state.gates = [];
    state.crystals = [];
    state.particles = [];
    state.score = 0;
    state.lives = LIVES;
    state.distance = 0;
    state.elapsed = 0;
    state.speed = GATE.speed;
    state.spawnTimer = 0.9;
    state.crystalTimer = 1.4;
    state.interval = GATE.interval;
    state.combo = 0;
    state.bestCombo = 0;
    state.over = false;
    state.flash = 0;
    state.gateCount = 0;
  }

  /** Move the ship to `lane` (0..2); a hop takes PLAYER.hopTime and eases between lanes. */
  function hopTo(lane) {
    if (lane < 0 || lane > 2 || lane === state.player.lane) return;
    state.player.lane = lane;
    state.player.fromY = state.player.y;
    state.player.hop = 0;
  }

  /** Set the ship's prism colour (0..2). */
  function setColor(index) {
    if (index < 0 || index > 2) return;
    state.player.color = index;
  }

  function burst(x, y, colorIndex, count, spread) {
    for (let index = 0; index < count; index += 1) {
      const angle = random() * Math.PI * 2;
      const speed = spread * (0.35 + random());
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.35 + random() * 0.45,
        maxLife: 0.8,
        color: colorIndex,
      });
    }
  }

  /**
   * Advance one fixed step. `action` may name a lane to hop to and a colour to switch to;
   * `silent` skips scoring side effects the screenshot scenes do not need to see.
   * Returns a bitmask of the events that happened.
   */
  function step(dt, action, silent) {
    if (state.over) return EVENT_NONE;
    let events = EVENT_NONE;
    const player = state.player;

    state.elapsed += dt;
    const ramp = Math.min(1, state.elapsed / RAMP_SECONDS);
    state.speed = GATE.speed + (GATE.maxSpeed - GATE.speed) * ramp;
    state.distance += state.speed * dt;

    if (action) {
      if (action.lane !== undefined) hopTo(action.lane);
      if (action.color !== undefined) setColor(action.color);
    }

    // The hop eases from the old lane to the new one, and the trail keeps the ship's path.
    if (player.hop < 1) {
      player.hop = Math.min(1, player.hop + dt / PLAYER.hopTime);
      const ease = player.hop * player.hop * (3 - 2 * player.hop);
      player.y = player.fromY + (LANES[player.lane] - player.fromY) * ease;
    } else {
      player.y = LANES[player.lane];
    }
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.trail.push({ x: PLAYER.x, y: player.y, color: player.color, age: 0 });
    for (const point of player.trail) point.age += dt;
    player.trail = player.trail.filter((point) => point.age <= PLAYER.trailSeconds);

    // Gates travel left; a ship of the same colour passes, another colour breaks.
    for (const gate of state.gates) {
      gate.x -= state.speed * dt;
      if (gate.done) continue;
      const overlaps = gate.x < PLAYER.x + PLAYER.width && gate.x + GATE.width > PLAYER.x;
      if (!overlaps || gate.lane !== player.lane) continue;
      if (gate.color === player.color) {
        gate.done = true;
        gate.open = 1;
        state.combo += 1;
        state.bestCombo = Math.max(state.bestCombo, state.combo);
        if (!silent) state.score += GATE.passPoints * Math.min(5, 1 + Math.floor(state.combo / 4));
        burst(gate.x + GATE.width / 2, LANES[gate.lane], gate.color, 12, 210);
        events |= EVENT_PASS;
      } else if (player.invulnerable <= 0) {
        gate.done = true;
        gate.broken = 1;
        state.lives -= 1;
        state.combo = 0;
        state.flash = 0.35;
        player.invulnerable = PLAYER.invulnerable;
        burst(gate.x, LANES[gate.lane], gate.color, 26, 340);
        events |= EVENT_HIT;
        if (state.lives <= 0) {
          state.over = true;
          events |= EVENT_OVER;
        }
      }
    }
    state.gates = state.gates.filter((gate) => gate.x + GATE.width > -40);

    // Crystals are free points and never hurt.
    for (const crystal of state.crystals) {
      crystal.x -= state.speed * dt;
      crystal.phase += dt * 3.2;
      if (crystal.taken) continue;
      const near = Math.abs(crystal.x - (PLAYER.x + PLAYER.width / 2)) < 34;
      if (near && crystal.lane === player.lane) {
        crystal.taken = true;
        state.combo += 1;
        state.bestCombo = Math.max(state.bestCombo, state.combo);
        if (!silent) state.score += CRYSTAL.points;
        burst(crystal.x, LANES[crystal.lane], crystal.color, 10, 170);
        events |= EVENT_PICK;
      }
    }
    state.crystals = state.crystals.filter((crystal) => !crystal.taken && crystal.x > -40);

    // Particles fade out where they were made.
    for (const particle of state.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 1 - 2.6 * dt;
      particle.vy *= 1 - 2.6 * dt;
      particle.life -= dt;
    }
    state.particles = state.particles.filter((particle) => particle.life > 0);
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt);

    // Spawn gates on a timer that shortens as the run goes on, never twice on one lane.
    // The prism colour cycles so a run always shows all three, with a small shuffle so the
    // order is never quite the same.
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      const lane = pick(random, 3);
      const color = state.gateCount % COLORS.length;
      const last = state.gates[state.gates.length - 1];
      const clear = !last || last.lane !== lane || last.x < FIELD.width - 150;
      if (clear) {
        state.gates.push({ x: FIELD.width + 40, lane, color, done: false, open: 0, broken: 0 });
        state.gateCount += 1;
      }
      state.interval = Math.max(GATE.minInterval, state.interval * GATE.intervalScale);
      state.spawnTimer = state.interval * (0.8 + random() * 0.5);
    }

    state.crystalTimer -= dt;
    if (state.crystalTimer <= 0) {
      state.crystals.push({
        x: FIELD.width + 40,
        lane: pick(random, 3),
        color: pick(random, COLORS.length),
        phase: random() * Math.PI * 2,
        taken: false,
      });
      state.crystalTimer = CRYSTAL.interval + random() * CRYSTAL.jitter;
    }

    return events;
  }

  return { state, step, reset, hopTo, setColor };
}
