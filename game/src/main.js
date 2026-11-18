// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The
// game moves between four screens: title, play, paused and hull breach.
//
// ?seed=N fixes the run. ?shot=start|play|end (with &seed=N) stages that scene instead of
// running the loop, paints it twice and sets window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_HIT, EVENT_OVER, EVENT_PASS, EVENT_PICK } from './world.js';
import { createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

function announce(text) {
  if (status) status.textContent = text;
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(window);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  announce('Prism Drift. Press space to fly.');

  function startRun() {
    world.reset();
    screen = SCREEN_PLAY;
    announce('Fly. Match the gate colours.');
  }

  function endRun() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Hull breach. Score ${world.state.score}. Press space to fly again.`);
  }

  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;

    const intent = input.take();

    if (screen === SCREEN_TITLE) {
      if (intent.confirm) startRun();
    } else if (screen === SCREEN_PAUSED) {
      if (intent.pause || intent.confirm) screen = SCREEN_PLAY;
    } else if (screen === SCREEN_OVER) {
      if (intent.confirm) startRun();
    } else {
      if (intent.pause) {
        screen = SCREEN_PAUSED;
      } else {
        if (intent.up) world.hopTo(world.state.player.lane - 1);
        if (intent.down) world.hopTo(world.state.player.lane + 1);
        if (intent.color !== null) world.setColor(intent.color);
      }
    }

    if (screen === SCREEN_PLAY) {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const events = world.step(STEP, {}, false);
        if (events & EVENT_HIT) announce('Hull hit. Match the gate colour.');
        if (events & EVENT_PASS) announce('Gate cleared.');
        if (events & EVENT_PICK) announce('Crystal taken.');
        if (events & EVENT_OVER) {
          endRun();
          break;
        }
      }
    }

    renderer.draw(world.state, screen, best);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

if (shot !== null) runShot(shot);
else runGame();

// Keep the canvas sharp when the window changes size.
window.addEventListener('resize', () => {
  if (shot === null) return;
  const scene = shot === 'play' ? SCREEN_PLAY : shot === 'end' ? SCREEN_OVER : SCREEN_TITLE;
  renderer.draw(world.state, scene, 0);
});
