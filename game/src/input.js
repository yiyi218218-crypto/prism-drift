// Keyboard input, read as intents rather than keys. The game asks once a frame what the
// player wants this step: hop up, hop down, shift prism colour, confirm, or pause.

const LANE_UP = ['ArrowUp', 'KeyW'];
const LANE_DOWN = ['ArrowDown', 'KeyS'];
const CONFIRM = ['Space', 'Enter'];
const PAUSE = ['KeyP', 'Escape'];
const COLOR_KEYS = ['Digit1', 'Digit2', 'Digit3'];

export function createInput(target) {
  const pressed = new Set();

  function onKeyDown(event) {
    if (CONFIRM.includes(event.code) || LANE_UP.includes(event.code) || LANE_DOWN.includes(event.code)) {
      event.preventDefault();
    }
    pressed.add(event.code);
  }

  function onKeyUp(event) {
    pressed.delete(event.code);
  }

  function onBlur() {
    pressed.clear();
  }

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  /** Take everything pressed since the last call, and forget it. */
  function take() {
    const intent = { up: false, down: false, confirm: false, pause: false, color: null };
    for (const code of pressed) {
      if (LANE_UP.includes(code)) intent.up = true;
      else if (LANE_DOWN.includes(code)) intent.down = true;
      else if (CONFIRM.includes(code)) intent.confirm = true;
      else if (PAUSE.includes(code)) intent.pause = true;
      else {
        const index = COLOR_KEYS.indexOf(code);
        if (index >= 0) intent.color = index;
      }
    }
    pressed.clear();
    return intent;
  }

  return { take };
}
