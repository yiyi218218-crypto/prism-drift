// All the drawing of PRISM DRIFT. The playfield is a fixed 1280x720 logical area; the canvas
// is scaled to the window and the device pixel ratio, so every coordinate below is logical.
//
// The look: a deep indigo void, three thin light lanes, and everything that matters drawn in
// one of the three prism colours with a soft halo, so a frame reads at a glance and the colour
// rule is visible without reading a word.

import { COLORS, FIELD, GATE, LANES, LIVES, PLAYER } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const STAR_COUNT = 150;

/** Fixed star positions from a tiny hash, so the sky never flickers between frames. */
function starAt(index) {
  const h = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  const v = h - Math.floor(h);
  const h2 = Math.sin(index * 269.5 + 183.3) * 43758.5453;
  const v2 = h2 - Math.floor(h2);
  return { x: v * FIELD.width, y: v2 * FIELD.height, size: 0.6 + (v2 * 2.1) % 1.8 };
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function resize() {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    offsetX = (canvas.width - FIELD.width * scale) / 2;
    offsetY = (canvas.height - FIELD.height * scale) / 2;
  }

  function glow(color, blur) {
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
  }

  function noGlow() {
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }

  function drawBackground(state) {
    const sky = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    sky.addColorStop(0, '#04050d');
    sky.addColorStop(0.55, '#080a18');
    sky.addColorStop(1, '#0d0b1e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    // The horizon glow that the lanes run out of.
    const halo = ctx.createRadialGradient(FIELD.width * 0.5, FIELD.height * 0.62, 40, FIELD.width * 0.5, FIELD.height * 0.62, 640);
    halo.addColorStop(0, 'rgba(64,58,140,0.22)');
    halo.addColorStop(1, 'rgba(64,58,140,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    // Two soft nebulae in the prism colours, for depth.
    const nebulaA = ctx.createRadialGradient(170, 110, 10, 170, 110, 430);
    nebulaA.addColorStop(0, 'rgba(63,245,255,0.055)');
    nebulaA.addColorStop(1, 'rgba(63,245,255,0)');
    ctx.fillStyle = nebulaA;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    const nebulaB = ctx.createRadialGradient(1120, 610, 10, 1120, 610, 470);
    nebulaB.addColorStop(0, 'rgba(255,79,216,0.055)');
    nebulaB.addColorStop(1, 'rgba(255,79,216,0)');
    ctx.fillStyle = nebulaB;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    // Parallax stars drift left with the run.
    const drift = state ? (state.distance * 0.08) % FIELD.width : 0;
    for (let index = 0; index < STAR_COUNT; index += 1) {
      const star = starAt(index);
      const x = (star.x - drift + FIELD.width) % FIELD.width;
      const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(index * 1.7 + (state ? state.elapsed * 1.6 : 0)));
      ctx.fillStyle = `rgba(190,205,255,${0.16 + twinkle * 0.34})`;
      ctx.fillRect(x, star.y, star.size, star.size);
    }

    // A faint perspective grid under the lanes, selling speed without clutter.
    ctx.strokeStyle = 'rgba(96,110,190,0.10)';
    ctx.lineWidth = 1;
    const gridDrift = state ? (state.distance * 0.55) % 96 : 0;
    for (let x = -96; x < FIELD.width + 96; x += 96) {
      const px = x - gridDrift;
      ctx.beginPath();
      ctx.moveTo(px, LANES[0] - 60);
      ctx.lineTo(px - 46, FIELD.height);
      ctx.stroke();
    }

    // Speed streaks: short horizontal light lines that sell motion.
    if (state) {
      for (let index = 0; index < 16; index += 1) {
        const y = (index * 137.5 + 41) % FIELD.height;
        const speed = 1 + (index % 4) * 0.55;
        const x = FIELD.width - ((state.distance * speed * 0.85 + index * 197) % (FIELD.width + 320));
        const len = 36 + (index % 5) * 32;
        ctx.strokeStyle = `rgba(150,180,255,${0.045 + (index % 3) * 0.025})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + len, y);
        ctx.stroke();
      }
    }
  }

  function drawLanes(state) {
    for (let index = 0; index < LANES.length; index += 1) {
      const y = LANES[index] + PLAYER.height / 2 + 16;
      const active = state && !state.over && state.player.lane === index;
      if (active) {
        glow('rgba(120,160,255,0.9)', 12);
        ctx.strokeStyle = 'rgba(150,185,255,0.62)';
      } else {
        noGlow();
        ctx.strokeStyle = 'rgba(105,125,205,0.26)';
      }
      ctx.lineWidth = active ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(FIELD.width, y);
      ctx.stroke();
      noGlow();
    }
  }

  function drawGate(gate) {
    const color = COLORS[gate.color];
    const top = LANES[gate.lane] - PLAYER.height / 2 - 26;
    const height = PLAYER.height + 52;
    const x = gate.x;

    if (gate.broken) {
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 6, top + 4);
      ctx.lineTo(x + GATE.width - 6, top + height - 4);
      ctx.moveTo(x + GATE.width - 6, top + 4);
      ctx.lineTo(x + 6, top + height - 4);
      ctx.stroke();
      return;
    }

    // The light curtain between the posts: solid for the ship's colour, dim otherwise.
    const open = gate.color === (gate.openColor ?? -1);
    const curtain = ctx.createLinearGradient(x, top, x, top + height);
    curtain.addColorStop(0, color.glow);
    curtain.addColorStop(0.5, open ? color.core : color.glow);
    curtain.addColorStop(1, color.glow);
    ctx.fillStyle = curtain;
    ctx.globalAlpha = 0.28;
    ctx.fillRect(x, top, GATE.width, height);
    ctx.globalAlpha = 1;

    // Scanlines inside the curtain.
    ctx.strokeStyle = color.core;
    ctx.globalAlpha = 0.30;
    ctx.lineWidth = 1;
    for (let y = top + 6; y < top + height; y += 9) {
      ctx.beginPath();
      ctx.moveTo(x + 4, y);
      ctx.lineTo(x + GATE.width - 4, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // The two posts, brightest at their tips.
    glow(color.core, 16);
    ctx.fillStyle = color.core;
    ctx.fillRect(x - 3, top - 8, 6, height + 16);
    ctx.fillRect(x + GATE.width - 3, top - 8, 6, height + 16);
    noGlow();
  }

  function drawCrystal(crystal) {
    const color = COLORS[crystal.color];
    const y = LANES[crystal.lane];
    const r = 13 + Math.sin(crystal.phase) * 3;
    ctx.save();
    ctx.translate(crystal.x, y);
    ctx.rotate(crystal.phase * 0.6);
    glow(color.core, 18);
    ctx.fillStyle = color.core;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.62, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.62, 0);
    ctx.closePath();
    ctx.fill();
    noGlow();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.55);
    ctx.lineTo(r * 0.26, 0);
    ctx.lineTo(0, r * 0.55);
    ctx.lineTo(-r * 0.26, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawPlayer(player, state) {
    const color = COLORS[player.color];
    const flicker = player.invulnerable > 0 ? 0.45 + 0.55 * Math.abs(Math.sin(state.elapsed * 22)) : 1;

    // The trail: older points smaller and dimmer, in the colour they were laid in.
    for (const point of player.trail) {
      const age = 1 - point.age / PLAYER.trailSeconds;
      const trailColor = COLORS[point.color];
      ctx.globalAlpha = age * 0.55;
      ctx.fillStyle = trailColor.core;
      ctx.beginPath();
      ctx.arc(point.x - (1 - age) * 96, point.y, 1.5 + age * 5.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(PLAYER.x + PLAYER.width / 2, player.y);
    ctx.globalAlpha = flicker;

    // Engine flare behind the hull.
    glow(color.core, 26);
    ctx.fillStyle = color.glow;
    ctx.beginPath();
    ctx.moveTo(-PLAYER.width / 2 + 6, 0);
    ctx.lineTo(-PLAYER.width / 2 - 26 - Math.sin(state.elapsed * 30) * 5, 0);
    ctx.lineTo(-PLAYER.width / 2 + 6, 8);
    ctx.closePath();
    ctx.fill();

    // The hull: an arrowhead cut from light.
    ctx.fillStyle = color.core;
    ctx.beginPath();
    ctx.moveTo(PLAYER.width / 2, 0);
    ctx.lineTo(-PLAYER.width / 2 + 4, -PLAYER.height / 2);
    ctx.lineTo(-PLAYER.width / 2 + 16, 0);
    ctx.lineTo(-PLAYER.width / 2 + 4, PLAYER.height / 2);
    ctx.closePath();
    ctx.fill();
    noGlow();

    // A white core so the ship stays readable against its own halo.
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.moveTo(PLAYER.width / 2 - 10, 0);
    ctx.lineTo(-PLAYER.width / 2 + 14, -6);
    ctx.lineTo(-PLAYER.width / 2 + 14, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawParticles(particles) {
    for (const particle of particles) {
      const color = COLORS[particle.color];
      const alpha = Math.max(0, particle.life / particle.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color.core;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 1.6 + alpha * 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(state) {
    // Score, top left, in a wide thin face.
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(170,190,255,0.55)';
    ctx.font = '600 15px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('SCORE', 48, 36);
    ctx.fillStyle = '#eaf2ff';
    ctx.font = '800 42px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(String(state.score).padStart(5, '0'), 46, 54);

    // Lives, top right, as small hulls.
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(170,190,255,0.55)';
    ctx.font = '600 15px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('HULL', FIELD.width - 48, 36);
    for (let index = 0; index < LIVES; index += 1) {
      const alive = index < state.lives;
      const x = FIELD.width - 60 - index * 34;
      const y = 68;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = alive ? '#eaf2ff' : 'rgba(120,135,180,0.22)';
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-9, -10);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-9, 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // The colour strip, bottom centre: the rule made visible.
    const totalWidth = COLORS.length * 116 - 20;
    const startX = FIELD.width / 2 - totalWidth / 2;
    for (let index = 0; index < COLORS.length; index += 1) {
      const color = COLORS[index];
      const x = startX + index * 116;
      const y = FIELD.height - 62;
      const active = state.player.color === index;
      ctx.fillStyle = active ? color.core : 'rgba(110,130,210,0.16)';
      if (active) glow(color.core, 18);
      ctx.fillRect(x, y, 96, 6);
      noGlow();
      ctx.textAlign = 'center';
      ctx.font = `${active ? 800 : 600} 13px "Segoe UI", system-ui, sans-serif`;
      ctx.fillStyle = active ? color.core : 'rgba(150,168,220,0.42)';
      ctx.fillText(color.name, x + 48, y + 16);
    }

    // Combo, when it is worth showing.
    if (state.combo >= 4) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(234,242,255,0.75)';
      ctx.font = '800 20px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(`${state.combo}x CHAIN`, FIELD.width / 2, FIELD.height - 108);
    }

    // A red edge flash when a hull is lost.
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255,60,90,${state.flash * 0.5})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
  }

  function drawTitle(best) {
    const cx = FIELD.width / 2;
    ctx.textAlign = 'center';

    // A prism mark: three overlapping triangles in the three colours.
    const baseY = 196;
    for (let index = 0; index < COLORS.length; index += 1) {
      const color = COLORS[index];
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / 3;
      const x = cx + Math.cos(angle) * 46;
      const y = baseY + Math.sin(angle) * 46;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);
      glow(color.core, 30);
      ctx.strokeStyle = color.core;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(0, -34);
      ctx.lineTo(30, 21);
      ctx.lineTo(-30, 21);
      ctx.closePath();
      ctx.stroke();
      noGlow();
      ctx.restore();
    }

    glow('rgba(120,150,255,0.5)', 34);
    ctx.fillStyle = '#f6f9ff';
    ctx.font = '900 96px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('PRISM DRIFT', cx, 328);
    noGlow();

    ctx.fillStyle = 'rgba(165,185,245,0.78)';
    ctx.font = '500 22px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Match the gate’s colour. Break the wrong one and lose a hull.', cx, 442);

    // Three mini legends, one per colour.
    for (let index = 0; index < COLORS.length; index += 1) {
      const color = COLORS[index];
      const x = cx - 260 + index * 260;
      glow(color.core, 16);
      ctx.fillStyle = color.core;
      ctx.fillRect(x - 46, 490, 92, 5);
      noGlow();
      ctx.fillStyle = color.core;
      ctx.font = '800 17px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(color.name, x, 512);
      ctx.fillStyle = 'rgba(150,168,220,0.55)';
      ctx.font = '500 13px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(`KEY ${index + 1}`, x, 534);
    }

    const pulse = 0.55 + 0.45 * Math.sin(performance.now() / 420);
    ctx.fillStyle = `rgba(234,242,255,${pulse})`;
    ctx.font = '700 21px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('PRESS SPACE TO FLY', cx, 588);

    ctx.fillStyle = 'rgba(140,158,205,0.52)';
    ctx.font = '500 15px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('↑ ↓ hop lanes   ·   1 2 3 shift prism   ·   P pause', cx, 624);
    if (best > 0) {
      ctx.fillStyle = 'rgba(140,158,205,0.68)';
      ctx.fillText(`BEST ${best}`, cx, 652);
    }
  }

  function drawOver(state, best) {
    const cx = FIELD.width / 2;
    ctx.fillStyle = 'rgba(4,5,13,0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // A soft vignette keeps the words legible over whatever the run left on screen.
    const vignette = ctx.createRadialGradient(cx, 380, 40, cx, 380, 520);
    vignette.addColorStop(0, 'rgba(4,5,13,0.88)');
    vignette.addColorStop(1, 'rgba(4,5,13,0)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.fillStyle = '#ff5f7a';
    glow('#ff5f7a', 28);
    ctx.font = '900 62px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('HULL BREACH', cx, 208);
    noGlow();

    ctx.fillStyle = 'rgba(170,190,255,0.62)';
    ctx.font = '700 15px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('SCORE', cx, 312);

    ctx.fillStyle = '#f2f6ff';
    ctx.font = '900 88px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(String(state.score), cx, 338);

    ctx.fillStyle = 'rgba(160,180,240,0.72)';
    ctx.font = '500 19px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`DISTANCE ${Math.round(state.distance / 100)} km   ·   BEST CHAIN ${state.bestCombo}x`, cx, 458);

    const pulse = 0.55 + 0.45 * Math.sin(performance.now() / 420);
    ctx.fillStyle = `rgba(234,242,255,${pulse})`;
    ctx.font = '700 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('PRESS SPACE TO FLY AGAIN', cx, 530);

    if (best > 0) {
      ctx.fillStyle = 'rgba(140,158,205,0.62)';
      ctx.font = '500 15px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(`BEST ${best}`, cx, 572);
    }
  }

  function draw(state, screen, best) {
    resize();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#04050d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    drawBackground(screen === SCREEN_TITLE ? null : state);
    drawLanes(screen === SCREEN_PLAY ? state : null);

    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) {
      for (const gate of state.gates) {
        gate.openColor = state.player.color;
        drawGate(gate);
      }
      for (const crystal of state.crystals) drawCrystal(crystal);
      drawParticles(state.particles);
      drawPlayer(state.player, state);
      drawHud(state);
      if (screen === SCREEN_PAUSED) {
        ctx.fillStyle = 'rgba(4,5,13,0.66)';
        ctx.fillRect(0, 0, FIELD.width, FIELD.height);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f2f6ff';
        ctx.font = '900 58px "Segoe UI", system-ui, sans-serif';
        ctx.fillText('PAUSED', FIELD.width / 2, 350);
        ctx.fillStyle = 'rgba(160,180,240,0.7)';
        ctx.font = '500 18px "Segoe UI", system-ui, sans-serif';
        ctx.fillText('PRESS P OR SPACE TO RESUME', FIELD.width / 2, 396);
      }
    } else if (screen === SCREEN_TITLE) {
      // A few drifting crystals behind the title for depth.
      const t = performance.now() / 1000;
      for (let index = 0; index < 7; index += 1) {
        drawCrystal({
          x: 140 + index * 172 + Math.sin(t * 0.4 + index) * 14,
          lane: index % 3,
          color: index % 3,
          phase: t * 1.4 + index,
        });
      }
      drawTitle(best);
    } else {
      drawParticles(state.particles);
      drawOver(state, best);
    }
  }

  return { draw };
}
