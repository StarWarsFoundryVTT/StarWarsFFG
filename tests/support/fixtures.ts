import { test as base } from '@playwright/test';
import { World } from './world';
import { Consumers } from './consumers';
import { installConsoleGuard, type ConsoleGuard } from './console-guard';
import { expect } from './matchers';

/**
 * Import `test` and `expect` from here, not from `@playwright/test` - otherwise the
 * console guard and teardown don't run. Teardown is a fixture so it still runs when a
 * test throws.
 */

interface Fixtures {
  world: World;
  consumers: Consumers;
  consoleGuard: ConsoleGuard;
}

export const test = base.extend<Fixtures>({
  // Attach first, so it's listening before anything navigates.
  consoleGuard: async ({ page }, use, testInfo) => {
    const guard = installConsoleGuard(page, testInfo);
    await use(guard);
    guard.assertClean();
  },

  world: async ({ page, consoleGuard }, use) => {
    void consoleGuard; // must be installed before we navigate
    await page.goto('/game');
    await page.waitForFunction(() => game?.ready === true, undefined, { timeout: 60_000 });

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
