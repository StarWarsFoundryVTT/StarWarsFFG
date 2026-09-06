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

export const test = base.extend<Fixtures, WorkerFixtures>({
  /**
   * One booted Foundry per worker, shared by every test that worker runs.
   */
  foundryPage: [async ({ browser }, use) => {
    // A manually created context doesn't inherit baseURL or storageState from the config, so
    // both are resolved the same way the config resolves them.
    const context = await browser.newContext({
      baseURL: process.env.FOUNDRY_URL,
      storageState: path.resolve(__dirname, '../.auth/state.json'),
    });
    const page = await context.newPage();
    await page.goto('/game');
    await page.waitForFunction(() => game?.ready === true, undefined, { timeout: 60_000 });
    await use(page);
    await context.close();
  }, { scope: 'worker' }],

  /** Hand tests the shared page, so specs keep using `{ page }` unchanged. */
  page: async ({ foundryPage }, use) => {
    await use(foundryPage);
  },

  consoleGuard: async ({ page }, use, testInfo) => {
    const guard = installConsoleGuard(page, testInfo);
    await use(guard);
    // detach before asserting, so a failure here doesn't leave a listener on the shared page
    guard.detach();
    guard.assertClean();
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
export type { Ctx, BuildSpec, ModifierSpec, Origin, Depth } from './world';
export type { Reading, PoolSummary } from './consumers';
