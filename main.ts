// Hands PRISM DRIFT in: copies the playable game and its screenshots to /output, then writes
// the dossier the judge reads. The game itself is plain static files under game/, so this
// program only moves bytes and summarises them; it never builds, bundles or rewrites the game.
//
// Run it outside the grader with a local output folder:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(root, 'game');
const shotsDir = join(root, 'screenshots');

// Refuse to hand in an entry the gate would refuse anyway.
if (!existsSync(join(gameDir, 'index.html'))) {
  throw new Error('game/index.html is missing: the entry needs the playable game');
}
if (!existsSync(shotsDir)) {
  throw new Error('screenshots/ is missing: the entry needs 3 or 4 real screenshots');
}

const shots = readdirSync(shotsDir).filter((name) => /\.(png|jpe?g)$/i.test(name));
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`screenshots/ holds ${shots.length} images: the entry needs 3 or 4`);
}

mkdirSync(output, { recursive: true });
cpSync(gameDir, join(output, 'game'), { recursive: true });
cpSync(shotsDir, join(output, 'screenshots'), { recursive: true });

// The scorer's own caps, so a local run refuses what the grader would refuse.
const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

writeFileSync(join(output, 'dossier.json'), buildDossier(output, caps));

console.log(`handed in ${shots.length} screenshots and the game from ${gameDir}`);
