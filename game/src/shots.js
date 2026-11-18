// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules forward
// from a fresh world, steered by an autopilot, so the frame is what a short run really looks
// like and the same seed always gives the same frame.

import { GATE, PLAYER, STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 4;
const PLAY_SECONDS = 24;
const END_LIMIT_SECONDS = 240;

/** The nearest gate still ahead of the ship, or null. */
function nextGate(state) {
  let best = null;
  for (const gate of state.gates) {
    if (gate.done) continue;
    if (gate.x + GATE.width < PLAYER.x - 20) continue;
    if (best === null || gate.x < best.x) best = gate;
  }
  return best;
}

/**
 * A steady pilot: shift the prism colour at once, hop lanes early enough to make it.
 * The `sloppy` variant reacts late and now and then refuses a colour, so its run ends
 * the way a hurried player's does — that is the end screen.
 */
function autopilot(state, sloppy, gateCount) {
  const gate = nextGate(state);
  if (gate === null) return {};
  const distance = gate.x - (PLAYER.x + PLAYER.width);
  const action = {};

  const colourReach = sloppy ? 300 : 520;
  const laneReach = sloppy ? 190 : 380;
  const skip = sloppy && gateCount % 9 === 8;

  if (!skip && distance < colourReach && gate.color !== state.player.color) {
    action.color = gate.color;
  }
  if (distance < laneReach && gate.lane !== state.player.lane) {
    action.lane = gate.lane;
  }
  return action;
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start) and return the
 * screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, {}, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }

  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  let gateCount = 0;
  let seen = null;
  for (let index = 0; index < limit / STEP; index += 1) {
    const gate = nextGate(world.state);
    if (gate !== null && gate !== seen) {
      seen = gate;
      gateCount += 1;
    }
    const action = autopilot(world.state, name === 'end', gateCount);
    const events = world.step(STEP, action, false);
    if (events & 8) break;
  }
  const over = world.state.over;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
