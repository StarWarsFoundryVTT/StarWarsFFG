/*
 * Why is the suite five minutes locally and two hours on a runner?
 *
 * The Playwright report says a five-property `page.evaluate` - no I/O, no awaits - cost 1253ms
 * six minutes into a CI run and 20ms thirty-six minutes in, while screencast frames kept
 * arriving every 32-50ms throughout. A renderer that is drawing on time is not a renderer that
 * is too busy to read five properties, so the time is going somewhere between this process and
 * that one. This measures where, in four phases that each remove one suspect:
 *
 *   A  about:blank      - the transport with no application in the way at all
 *   B  the Foundry page - the same round trip with the world loaded
 *   C  B + a console listener - the suite attaches one; CDP delivers every message over the
 *                              same channel the evaluate replies come back on
 *   D  a busy loop, timed inside the page and again here - which process is short of CPU
 *
 * Run it on both machines and compare. It needs a Foundry already serving the qa world:
 *
 *   FOUNDRY_URL=http://127.0.0.1:30000 node scripts/probe.mjs
 */
import { chromium } from '@playwright/test';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseURL = process.env.FOUNDRY_URL;
if (!baseURL) {
  console.error('FOUNDRY_URL is not set (e.g. http://127.0.0.1:30000)');
  process.exit(1);
}

/* The same flags the suite runs under, chosen the same way, so this measures that browser. */
const args = process.env.CI
  ? ['--enable-unsafe-swiftshader']
  : ['--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=gl-egl'];

const stats = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return {
    min: s[0],
    median: s[Math.floor(s.length / 2)],
    p95: s[Math.floor(s.length * 0.95)],
    max: s[s.length - 1],
  };
};

const fmt = (label, s) =>
  `${label.padEnd(34)} min ${s.min.toFixed(1).padStart(8)}  median ${s.median.toFixed(1).padStart(8)}` +
  `  p95 ${s.p95.toFixed(1).padStart(8)}  max ${s.max.toFixed(1).padStart(8)}   ms`;

/** `n` no-op round trips. Nothing is computed, so the whole cost is getting there and back. */
async function roundTrip(page, n = 200) {
  const took = [];
  for (let i = 0; i < n; i++) {
    const t = performance.now();
    await page.evaluate(() => 1);
    took.push(performance.now() - t);
  }
  return stats(took);
}

async function main() {
  console.log('host');
  console.log(`  cpus            ${os.cpus().length} x ${os.cpus()[0]?.model?.trim()}`);
  console.log(`  load            ${os.loadavg().map((n) => n.toFixed(2)).join(' ')}`);
  console.log(`  memory          ${(os.freemem() / 2 ** 30).toFixed(1)} GiB free of ${(os.totalmem() / 2 ** 30).toFixed(1)}`);
  console.log(`  args            ${args.join(' ') || '(none)'}`);
  console.log();

  const browser = await chromium.launch({ args });
  console.log(`  chromium        ${browser.version()}`);
  console.log();

  /* A: no application at all. Whatever this costs is the floor for everything below. */
  const blank = await browser.newPage();
  await blank.goto('about:blank');
  console.log(fmt('A  about:blank', await roundTrip(blank)));
  await blank.close();

  /* B: the same round trip against the world the suite tests. */
  const state = path.resolve(root, 'tests/.auth/state.json');
  const context = await browser.newContext({
    baseURL,
    ...(fs.existsSync(state) ? { storageState: state } : {}),
  });
  const page = await context.newPage();

  await page.goto(new URL('/join', baseURL).href);
  if (new URL(page.url()).pathname.startsWith('/join')) {
    await page.locator('#join-game-form select[name="userid"]').selectOption({ label: 'Gamemaster' });
    await page.locator('#join-game-form button[name="join"]').click();
  }
  await page.waitForFunction(() => globalThis.game?.ready === true, undefined, { timeout: 60_000 });
  const canvasReady = await page.evaluate(() => Boolean(globalThis.canvas?.ready));
  const scenes = await page.evaluate(() => globalThis.game?.scenes?.size ?? -1);
  console.log(`  canvas.ready    ${canvasReady}    scenes ${scenes}`);
  console.log();

  console.log(fmt('B  /game', await roundTrip(page)));

  /* C: the suite listens for console messages throughout. Every one is a CDP event arriving on
   * the same connection an evaluate's reply has to come back on. */
  let messages = 0;
  const onConsole = () => { messages++; };
  page.on('console', onConsole);
  const withListener = await roundTrip(page);
  page.off('console', onConsole);
  console.log(fmt('C  /game + console listener', withListener));
  console.log(`   (${messages} console messages arrived during C)`);

  /* D: 300ms of arithmetic, timed by the page itself and again from out here. The page's own
   * figure is how fast that renderer computes; the gap is what the trip added. */
  const inPage = [];
  const outside = [];
  for (let i = 0; i < 10; i++) {
    const t = performance.now();
    inPage.push(await page.evaluate(() => {
      const started = performance.now();
      let x = 0;
      while (performance.now() - started < 300) x += Math.sqrt(x + 1);
      return performance.now() - started;
    }));
    outside.push(performance.now() - t);
  }
  console.log();
  console.log(fmt('D  300ms busy loop, page-side', stats(inPage)));
  console.log(fmt('D  300ms busy loop, seen here', stats(outside)));

  /* The same arithmetic in this process, for the runner's CPU rather than the renderer's. */
  const here = [];
  for (let i = 0; i < 10; i++) {
    const started = performance.now();
    let x = 0;
    while (performance.now() - started < 300) x += Math.sqrt(x + 1);
    here.push(performance.now() - started);
  }
  console.log(fmt('D  300ms busy loop, in node', stats(here)));

  console.log();
  console.log(`  load after      ${os.loadavg().map((n) => n.toFixed(2)).join(' ')}`);

  await context.close();
  await browser.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
