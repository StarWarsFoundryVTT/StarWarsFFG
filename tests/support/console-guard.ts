import type { Page, TestInfo } from '@playwright/test';

/**
 * Fails any test whose page logged an error.
 *
 * Catches render exceptions and missing-helper errors that otherwise only show up as a
 * selector timeout somewhere unrelated.
 */

/** Noise that isn't worth failing a test over. */
const IGNORED = [
  // migration task, not a test failure
  /deprecated/i,
  /favicon\.ico/i,
];

const ignored = (text: string) => IGNORED.some((re) => re.test(text));

export interface ConsoleGuard {
  /** Errors seen so far. */
  readonly errors: string[];
  /** Throw if anything was collected. Runs automatically after each test. */
  assertClean(): void;
  /** Allow an error the test expects. */
  allow(pattern: string | RegExp): void;
}

export function installConsoleGuard(page: Page, testInfo: TestInfo): ConsoleGuard {
  const errors: string[] = [];
  const allowed: (string | RegExp)[] = [];

  const permitted = (text: string) =>
    allowed.some((p) => (typeof p === 'string' ? text.includes(p) : p.test(text)));

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (ignored(text) || permitted(text)) return;
    errors.push(`console.error: ${text}`);
  });

  // uncaught exceptions don't arrive as console messages
  page.on('pageerror', (err) => {
    const text = `${err.name}: ${err.message}`;
    if (ignored(text) || permitted(text)) return;
    errors.push(`pageerror: ${text}`);
  });

  return {
    get errors() { return errors; },
    allow(pattern) { allowed.push(pattern); },
    assertClean() {
      // don't pile on a test that already failed for its own reason
      if (testInfo.status !== testInfo.expectedStatus) return;
      if (errors.length === 0) return;
      const list = errors.map((e) => `  - ${e}`).join('\n');
      throw new Error(
        `The page logged ${errors.length} error(s) during this test:\n${list}\n\n` +
        'If one is expected, call consoleGuard.allow(...) in the test.',
      );
    },
  };
}
