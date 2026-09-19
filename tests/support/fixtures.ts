import { test as base, type Page } from '@playwright/test';
import path from 'node:path';
import { World } from './world';
import { Consumers } from './consumers';
import { installConsoleGuard, type ConsoleGuard } from './console-guard';
import { expect } from './matchers';

/**
 * Import `test` and `expect` from here, not from `@playwright/test` - otherwise the console
 * guard and teardown don't run. Teardown is a fixture so it still runs when a test throws.
 */

interface Fixtures {
  world: World;
  consumers: Consumers;
  consoleGuard: ConsoleGuard;
}

interface WorkerFixtures {
  foundryPage: Page;
}

/**
 * Projects whose specs draw a scene. Everything else runs with Foundry's canvas switched off
 */
const CANVAS_PROJECTS = new Set(['canvas', 'non-default-settings']);

/**
 * Wait for a freshly loaded page to be a world the tests can drive
 */
async function settle(page: Page): Promise<void> {
  await page.waitForFunction(
    () => (globalThis as any).game?.ready === true, undefined, { timeout: 60_000 });
  await page.addStyleTag({ content: '#notifications { pointer-events: none !important; }' });
}

/**
 * Put `core.noCanvas` where this project needs it
 */
async function useCanvas(page: Page, wanted: boolean): Promise<void> {
  const noCanvas = !wanted;
  const current = await page.evaluate(() => {
    try { return game.settings.get('core', 'noCanvas') as boolean; } catch { return null; }
  });
  if (current === null || current === noCanvas) return;

  // The set reloads the page, which is the point - the canvas is built during load.
  await page.evaluate(
    (v) => game.settings.set('core', 'noCanvas', v), noCanvas,
  ).catch((err: unknown) => {
    if (!/context was destroyed|Execution context|navigation/i.test(String(err))) throw err;
  });
  await page.goto('/game');
  await settle(page);

  const after = await page.evaluate(() => game.settings.get('core', 'noCanvas'));
  if (after !== noCanvas) {
    throw new Error(`Could not set core.noCanvas to ${noCanvas}: it is ${after}.`);
  }
}

export const test = base.extend<Fixtures, WorkerFixtures>({
  /**
   * One booted Foundry per worker, shared by every test that worker runs.
   */
  foundryPage: [async ({ browser }, use, workerInfo) => {
    // A manually created context doesn't inherit baseURL or storageState from the config, so
    // both are resolved the same way the config resolves them.
    const context = await browser.newContext({
      baseURL: process.env.FOUNDRY_URL,
      storageState: path.resolve(__dirname, '../.auth/state.json'),
    });
    const page = await context.newPage();
    await page.goto('/game');
    await settle(page);

    await useCanvas(page, CANVAS_PROJECTS.has(workerInfo.project.name));

    await use(page);
    await context.close();
  }, { scope: 'worker' }],

  /** Hand tests the shared page, so specs keep using `{ page }` unchanged. */
  page: async ({ foundryPage }, use) => {
    await use(foundryPage);
  },

  consoleGuard: async ({ page }, use, testInfo) => {
    const guard = await installConsoleGuard(page, testInfo);
    await use(guard);
    const posted = await guard.notifications();
    // detach before asserting, so a failure here doesn't leave a listener on the shared page
    guard.detach();
    guard.assertClean(posted);
  },

  world: async ({ page, consoleGuard }, use) => {
    void consoleGuard; // must be listening before the test touches anything
    const world = new World(page);
    await world.assertReady();
    await use(world);
    await world.teardown();
  },

  consumers: async ({ page }, use) => {
    await use(new Consumers(page));
  },
});

export { expect };
export type { Ctx, BuildSpec, ModifierSpec, AttributeSpec, TalentSpec, Origin,
              EncounterSpec, Encounter } from './world';
export type { Reading, PoolSummary } from './consumers';
