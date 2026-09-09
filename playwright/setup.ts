
import {chromium, expect, type FullConfig} from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const expectedWorld = process.env.FOUNDRY_TEST_WORLD;
  const expectedTitle = process.env.FOUNDRY_TEST_WORLD_TITLE;
  const expectedGeneration = Number(process.env.FOUNDRY_TEST_GENERATION ?? 14);
  if (!expectedWorld || !expectedTitle || ![13, 14].includes(expectedGeneration)) {
    throw new Error('Configure FOUNDRY_TEST_WORLD, FOUNDRY_TEST_WORLD_TITLE and FOUNDRY_TEST_GENERATION for a disposable test world before running browser tests.');
  }
  // TODO: this should probably be done before each test instead of globally
  // this will allow us to use specific accounts for each test, and in turn run tests in parallel
  const { baseURL, storageState, launchOptions } = config.projects[0].use;
  const browser = await chromium.launch(launchOptions);
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', error => console.error('Foundry startup error:', error.stack));
    // globalSetup drives its own browser, so it does not get the config's baseURL applied
    // automatically the way tests do - build the absolute URL from it here.
    await page.goto(new URL('/join', baseURL).href);
    // Validate before joining: a GM login can itself start system data migrations.
    await expect(page.locator('#main-header h1')).toHaveText(expectedTitle);
    await expect(page.locator('#software-version')).toContainText(new RegExp(`Version ${expectedGeneration}\\b`));
    if (expectedGeneration >= 14) {
      await page.getByRole('textbox', { name: 'Select User', exact: true }).click();
      await page.getByRole('listitem').filter({ hasText: /^Gamemaster$/ }).click();
      await page.getByRole('button', { name: 'Join Game Session', exact: true }).click();
    } else {
      await page.locator('#join-game-form select[name="userid"]').selectOption({ label: 'Gamemaster' });
      await page.locator('#join-game-form button[name="join"]').click();
    }
    await expect(page.locator('#chat-message')).toBeVisible();
    // the destiny tracker only exists once the system itself has booted, so it doubles as a "world is
    // ready" signal. Assert on the element rather than its text, which changes with the destiny pool.
    await expect(page.locator('#destinyDark')).toBeVisible({ timeout: 30_000 });

    const loaded = await page.evaluate(() => {
      const game = (window as any).game;
      return { world: game.world.id, system: game.system.id, generation: game.release.generation, isGM: game.user.isGM };
    });
    expect(loaded).toEqual({ world: expectedWorld, system: 'starwarsffg', generation: expectedGeneration, isGM: true });

    await page.context().storageState({ path: storageState as string });
  } finally {
    await browser.close();
  }
}

export default globalSetup;
