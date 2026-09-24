
import {chromium, expect, type FullConfig} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { isSeeded, seed } from './seed';

/**
 * World settings the suite depends on, and the values the system ships with. Anything a test
 * flips belongs here, so a run that never reached teardown cannot change what the next one tests.
 */
const WORLD_DEFAULTS: [namespace: string, key: string, value: unknown][] = [
  ['starwarsffg', 'useGenericSlots', true],
  // The suite runs most projects with the canvas off, and leaves it that way - see
  // `useCanvas` in fixtures.ts. Put back here so a run always starts from the same world.
  ['core', 'noCanvas', false],
];

async function globalSetup(config: FullConfig) {
  // TODO: this should probably be done before each test instead of globally
  // this will allow us to use specific accounts for each test, and in turn run tests in parallel
  const { baseURL, storageState, launchOptions } = config.projects[0].use;
  // The same graphics flags the tests run under - seeding draws the same canvas they do, and a
  // setup that booted Foundry differently would not be proving anything about the run that follows.
  const browser = await chromium.launch({ args: launchOptions?.args });
  const page = await browser.newPage();
  /*
  await page.goto(baseURL!);
  await page.getByLabel('User Name').fill('user');
  await page.getByLabel('Password').fill('password');
  await page.getByText('Sign in').click();
  await page.context().storageState({ path: storageState as string });
  await browser.close();

  */
  // globalSetup drives its own browser, so it does not get the config's baseURL applied
  // automatically the way tests do - build the absolute URL from it here.
  await page.goto(new URL('/join', baseURL).href);

  // An already-authenticated session is sent straight to /game and never sees the join form
  if (new URL(page.url()).pathname.startsWith('/join')) {
    // v13 renders the join screen as an ApplicationV2 into #join-game-form. The user <select>
    // holds user IDs as option values, so the user has to be picked by its visible label.
    await page.locator('#join-game-form select[name="userid"]').selectOption({ label: 'Gamemaster' });
    await page.locator('#join-game-form button[name="join"]').click();
  } else {
    console.log('[setup] already joined, skipping the join form');
  }

  // The world can take far longer than the default expect timeout to come up after joining,
  // so this waits on the same budget as the destiny tracker below rather than 5 seconds.
  await expect(page.getByRole('textbox', { name: 'Chat' })).toBeVisible({ timeout: 30_000 });
  // the destiny tracker only exists once the system itself has booted, so it doubles as a "world
  // is ready" signal. Assert on the element rather than its text, which changes with the pool.
  await expect(page.locator('#destinyDark')).toBeVisible({ timeout: 30_000 });

  // storageState now lives in a gitignored directory that may not exist on a fresh clone
  fs.mkdirSync(path.dirname(storageState as string), { recursive: true });
  await page.context().storageState({ path: storageState as string });

  /*
   * Put world-scoped settings back to their defaults before anything runs.
   */
  const settled = async () => {
    await page.waitForFunction(
      () => (globalThis as any).game?.ready === true, undefined, { timeout: 60_000 });
    await expect(page.locator('#destinyDark')).toBeVisible({ timeout: 30_000 });
  };

  for (const [namespace, key, value] of WORLD_DEFAULTS) {
    const before = await page.evaluate(
      ({ namespace, key }) => game.settings.get(namespace, key), { namespace, key });
    if (before === value) continue;

    console.log(`[setup] ${namespace}.${key} is ${before}, restoring the default ${value} (a run ended before its teardown)`);
    // One key per call, because the reload destroys the context this is evaluating in and anything
    // after it in a shared loop would never run.
    await page.evaluate(async ({ namespace, key, value }) => {
      await game.settings.set(namespace, key, value);
    }, { namespace, key, value }).catch((err: unknown) => {
      if (!/context was destroyed|Execution context|navigation/i.test(String(err))) throw err;
    });
    await settled();

    // Verified rather than assumed: a restore that does not take leaves every test in the run
    // exercising something other than what it says it does, and says nothing about it.
    const after = await page.evaluate(
      ({ namespace, key }) => game.settings.get(namespace, key), { namespace, key });
    if (after !== value) {
      throw new Error(
        `Could not restore the world setting "${namespace}.${key}": it is ${after}, expected ${value}.\n` +
        'Set it in the world by hand before running the suite - until it is, the tests that ' +
        'depend on it are testing something else.',
      );
    }
  }

  // Seed once per run, and only if the world doesn't already have the current fixtures. The
  // `import` origin and everything in ui/import/ read from what this creates.
  if (process.env.SKIP_SEED) {
    console.log('[setup] SKIP_SEED set, leaving the world as-is');
  } else if (await isSeeded(page)) {
    console.log('[setup] world already seeded, skipping');
  } else {
    console.log('[setup] seeding the world with the trimmed OggDude dataset');
    for (const line of await seed(page)) console.log(`[seed] ${line}`);
  }

  await browser.close();
}

export default globalSetup;
