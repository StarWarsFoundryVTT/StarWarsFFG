
import {chromium, type FullConfig} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';

async function globalSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use;
  if (!baseURL) {
    throw new Error('FOUNDRY_BASE_URL is required (for example http://127.0.0.1:30014). See playwright/README.md.');
  }

  const userName = process.env.FOUNDRY_USER_NAME || 'Gamemaster';
  const userPassword = process.env.FOUNDRY_USER_PASSWORD;
  const browser = await chromium.launch({channel: process.env.FOUNDRY_BROWSER_CHANNEL || 'chrome'});
  const page = await browser.newPage();
  await page.goto(new URL('/join', baseURL as string).toString());
  const userControl = page.locator('select[name="userid"], input[name="username"]').first();
  await userControl.waitFor({state: 'visible'});
  if (await userControl.evaluate(element => element.tagName === 'SELECT')) {
    await userControl.selectOption({label: userName});
  } else {
    await userControl.fill(userName);
  }
  if (userPassword) {
    const password = page.locator('input[type="password"]');
    if (await password.isVisible()) await password.fill(userPassword);
  }
  await page.getByRole('button', { name: 'Join Game' }).click();
  await page.waitForURL(/\/game\/?$/);
  await page.waitForFunction(() => Boolean(globalThis.game?.ready));

  await mkdir(dirname(storageState as string), {recursive: true});
  await page.context().storageState({ path: storageState as string });
  await browser.close();
}

export default globalSetup;
