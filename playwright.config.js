// @ts-check
import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Read environment variables from a local .env file, which is not checked in.
 * Copy .env.example to .env and point FOUNDRY_URL at your own Foundry server.
 *
 * Parsed here rather than via dotenv so that a fresh clone needs no extra install step.
 */
const envPath = path.resolve(__dirname, '.env');
const envFound = fs.existsSync(envPath);
if (envFound) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    // a real environment variable wins over the file, so one-off runs can override it
    if (match && !(match[1] in process.env)) {
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}

/*
 * Base URL of the Foundry server under test - scheme, host and port, with no trailing path.
 *
 * Deliberately has no default. A fallback such as http://localhost:30000 turns a misconfigured
 * FOUNDRY_URL into a connection timeout thirty seconds into globalSetup, which reads as a broken
 * test rather than a broken config. Failing here instead names the cause immediately.
 */
const baseURL = process.env.FOUNDRY_URL;
if (!baseURL) {
  throw new Error(
    'FOUNDRY_URL is not set.\n' +
    `  .env path : ${envPath} (${envFound ? 'found' : 'MISSING'})\n` +
    `  __dirname : ${__dirname}\n` +
    `  cwd       : ${process.cwd()}\n` +
    '  Copy .env.example to .env and set FOUNDRY_URL to your Foundry server.'
  );
}

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  globalSetup: require.resolve('./tests/support/global-setup.ts'),
  /* Run tests in files in parallel */
  fullyParallel: false, // TODO: investigate if we can figure out a way to do this
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Always use one worker due to how Foundry works */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Tests navigate with paths only ('/game/'), which resolve against this. */
    baseURL,
    /*
     * Saved auth state, written by globalSetup. Resolved against this config rather than the
     * working directory so that `npx playwright test` behaves the same from any subdirectory.
     */
    storageState: path.resolve(__dirname, 'tests/.auth/state.json'),
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
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

