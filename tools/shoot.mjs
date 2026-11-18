// Takes the entry's screenshots from the real game in a desktop Chrome, at 1280x720.
// Run the game's server first (node serve.ts --port 8123), then: node tools/shoot.mjs

import { chromium } from 'playwright';

const BASE = process.env.SHOT_BASE ?? 'http://localhost:8123';
const SHOTS = [
  ['1-start.jpg', '?shot=start&seed=1'],
  ['2-play.jpg', '?shot=play&seed=1'],
  ['3-end.jpg', '?shot=end&seed=1'],
];

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
page.on('pageerror', (error) => console.log('PAGEERROR:', error.message));
page.on('console', (message) => {
  if (message.type() === 'error') console.log('CONSOLE ERROR:', message.text());
});

for (const [name, query] of SHOTS) {
  await page.goto(`${BASE}/${query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 20000 });
  await page.screenshot({ path: `screenshots/${name}`, type: 'jpeg', quality: 92 });
  console.log('captured', name);
}

await browser.close();
console.log('done');
