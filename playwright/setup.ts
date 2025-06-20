
import {chromium, expect, type FullConfig} from '@playwright/test';

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
  await page.goto('http://overlord.wrycu.com:12121/join');
  await page.getByRole('combobox').selectOption('Gamemaster');
  await page.getByRole('button', { name: 'Join Game' }).click();
  await expect(page.getByRole('textbox', { name: 'Chat' })).toBeVisible();
  await expect(page.getByText('1Dark')).toBeVisible();

  await page.context().storageState({ path: storageState as string });
  await browser.close();
}

export default globalSetup;
