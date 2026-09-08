
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
  // Validate before joining: a GM login can itself start system data migrations.
  await expect(page.locator('#main-header h1')).toHaveText(expectedTitle);
  await expect(page.locator('#software-version')).toContainText(new RegExp(`Version ${expectedGeneration}\\b`));
  // v13 renders the join screen as an ApplicationV2 into #join-game-form. The user <select> holds
  // user IDs as option values, so the user has to be picked by its visible label.
  await page.locator('#join-game-form select[name="userid"]').selectOption({ label: 'Gamemaster' });
  await page.locator('#join-game-form button[name="join"]').click();
  await expect(page.getByRole('textbox', { name: 'Chat' })).toBeVisible();
  // the destiny tracker only exists once the system itself has booted, so it doubles as a "world is
  // ready" signal. Assert on the element rather than its text, which changes with the destiny pool.
  await expect(page.locator('#destinyDark')).toBeVisible({ timeout: 30_000 });

  const loaded = await page.evaluate(() => {
    const game = (window as any).game;
    return { world: game.world.id, system: game.system.id, generation: game.release.generation };
  });
  expect(loaded).toEqual({ world: expectedWorld, system: 'starwarsffg', generation: expectedGeneration });

  await page.context().storageState({ path: storageState as string });
  await browser.close();
}

export default globalSetup;
