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
 *   D  a fixed amount of arithmetic, run in the page and again here - how fast each process
 *      computes, and what the trip between them adds on top
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

  /* D: a fixed *amount* of work rather than a fixed duration - a loop bounded by the clock
   * reports its own bound back however slow the machine is, and says nothing. A set number of
   * iterations does not: how long they take is how fast that process computes. Run in the page
   * and again here, so a starved renderer and a starved runner are told apart, and the gap
   * between the page's own figure and the one seen from here is what the round trip added. */
  const WORK = 20_000_000;
  const inPage = [];
  const outside = [];
  for (let i = 0; i < 10; i++) {
    const t = performance.now();
    inPage.push(await page.evaluate((n) => {
      const started = performance.now();
      let x = 0;
      for (let j = 0; j < n; j++) x += Math.sqrt(j);
      // returned so the loop cannot be optimised away
      return [performance.now() - started, x][0];
    }, WORK));
    outside.push(performance.now() - t);
  }
  console.log();
  console.log(fmt(`D  ${WORK / 1e6}M iterations, page-side`, stats(inPage)));
  console.log(fmt(`D  ${WORK / 1e6}M iterations, seen here`, stats(outside)));

  /* The same arithmetic in this process, for the runner's CPU rather than the renderer's. */
  const here = [];
  for (let i = 0; i < 10; i++) {
    const started = performance.now();
    let x = 0;
    for (let j = 0; j < WORK; j++) x += Math.sqrt(j);
    here.push([performance.now() - started, x][0]);
  }
  console.log(fmt(`D  ${WORK / 1e6}M iterations, in node`, stats(here)));

  /* E: what those long tasks actually are. A no-op round trip costing ~470ms on an idle page
   * means the renderer's main thread is busy in repeating blocking tasks; `longtask` entries are
   * the browser's own record of them, and the attribution says which frame they came from. */
  console.log();
  const long = await page.evaluate(async () => {
    const seen = [];
    const observer = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) seen.push(Math.round(e.duration));
    });
    try { observer.observe({ entryTypes: ['longtask'] }); } catch { return null; }
    // Nothing is asked of the page for five seconds - whatever runs is the page's own doing.
    await new Promise((r) => setTimeout(r, 5000));
    observer.disconnect();
    return seen;
  });
  if (long === null) {
    console.log('E  longtask observer unavailable in this browser');
  } else {
    const total = long.reduce((a, b) => a + b, 0);
    console.log(`E  long tasks in 5s idle   ${long.length}, ${total}ms total (${(total / 50).toFixed(0)}% of the wall clock)`);
    console.log(`   durations              ${long.slice(0, 20).join(', ')}${long.length > 20 ? ' ...' : ''}`);
  }

  /* F: the canvas is the obvious suspect - Foundry keeps a PIXI ticker running with no scene
   * loaded, and on this runner it rasterises in software. `noCanvas` is the core setting that
   * turns the whole thing off, so if the tax is the canvas it goes away here and nowhere else. */
  console.log();
  const before = await page.evaluate(() => {
    try { return game.settings.get('core', 'noCanvas'); } catch { return null; }
  });
  if (before === null) {
    console.log('F  core.noCanvas is not a setting in this build - skipped');
  } else {
    await page.evaluate(() => game.settings.set('core', 'noCanvas', true))
      .catch(() => { /* the set reloads the page out from under the call */ });
    await page.goto(new URL('/game', baseURL).href);
    await page.waitForFunction(() => globalThis.game?.ready === true, undefined, { timeout: 60_000 });
    console.log(fmt('F  /game, canvas disabled', await roundTrip(page)));

    // Put it back: it is a client setting and the world's data directory outlives this process.
    await page.evaluate((v) => game.settings.set('core', 'noCanvas', v), before)
      .catch(() => { /* same reload */ });
  }

  console.log();
  console.log(`  load after      ${os.loadavg().map((n) => n.toFixed(2)).join(' ')}`);

  await context.close();
  await browser.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
