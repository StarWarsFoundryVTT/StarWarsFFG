// @ts-check
import { defineConfig, devices } from '@playwright/test';

const generation = process.env.FOUNDRY_GENERATION || '14';
const baseURL = process.env.FOUNDRY_BASE_URL;
const browserChannel = process.env.FOUNDRY_BROWSER_CHANNEL || 'chrome';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: require.resolve('./playwright/setup.ts'),
  /* Run tests in files in parallel */
  fullyParallel: false, // TODO: investigate if we can figure out a way to do this
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Foundry suites mutate one world and must run serially. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    storageState: `playwright/.auth/foundry-v${generation}.json`,
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: browserChannel,
        /*
         * devices['Desktop Chrome'] pins the user agent to the Chromium build Playwright bundles,
         * which currently reports Chrome 141. Foundry VTT 14 requires Chromium 146 or newer and
         * reads navigator.userAgent, so the pinned string makes a supported browser look
         * unsupported. Fall back to the real user agent of the installed channel.
         */
        userAgent: undefined,
        viewport: {
          width: 1440,
          height: 900
        },
        launchOptions: {
          // force GPU acceleration
          args: [
            '--ignore-gpu-blocklist',
            '--use-gl=angle',
            '--use-angle=gl-egl',
          ]
        },
      },
    },
    // TODO: re-enable all browsers
    /*
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    */
  ],
  // custom stuff added here
  expect: {
    timeout: 5_000,
  },
});
