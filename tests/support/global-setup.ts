
import {chromium, expect, type FullConfig} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { isSeeded, seed } from './seed';

async function globalSetup(config: FullConfig) {
  // TODO: this should probably be done before each test instead of globally
  // this will allow us to use specific accounts for each test, and in turn run tests in parallel
  const { baseURL, storageState } = config.projects[0].use;
  const browser = await chromium.launch();
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
  // v13 renders the join screen as an ApplicationV2 into #join-game-form. The user <select> holds
  // user IDs as option values, so the user has to be picked by its visible label.
  await page.locator('#join-game-form select[name="userid"]').selectOption({ label: 'Gamemaster' });
  await page.locator('#join-game-form button[name="join"]').click();
  await expect(page.getByRole('textbox', { name: 'Chat' })).toBeVisible();
  // the destiny tracker only exists once the system itself has booted, so it doubles as a "world is
  // ready" signal. Assert on the element rather than its text, which changes with the destiny pool.
  await expect(page.locator('#destinyDark')).toBeVisible({ timeout: 30_000 });

  // storageState now lives in a gitignored directory that may not exist on a fresh clone
  fs.mkdirSync(path.dirname(storageState as string), { recursive: true });
  await page.context().storageState({ path: storageState as string });

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
