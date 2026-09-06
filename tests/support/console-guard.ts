import type { ConsoleMessage, Page, TestInfo } from '@playwright/test';

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
  /** Stop listening. The page outlives the test, so listeners would otherwise pile up. */
  detach(): void;
}

export function installConsoleGuard(page: Page, testInfo: TestInfo): ConsoleGuard {
  const errors: string[] = [];
  const allowed: (string | RegExp)[] = [];

  const permitted = (text: string) =>
    allowed.some((p) => (typeof p === 'string' ? text.includes(p) : p.test(text)));

  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (ignored(text) || permitted(text)) return;
    errors.push(`console.error: ${text}`);
  };
  page.on('console', onConsole);

  // uncaught exceptions don't arrive as console messages
  const onPageError = (err: Error) => {
    const text = `${err.name}: ${err.message}`;
    if (ignored(text) || permitted(text)) return;
    // Keep the top frames. Without them a pageerror says what broke but not where, and finding
    // that out means reading the system's source until something plausible turns up.
    const frames = (err.stack ?? '')
      .split('\n')
      .filter((l) => /^\s*at /.test(l))
      .slice(0, 6)
      .map((l) => `      ${l.trim()}`)
      .join('\n');
    errors.push(`pageerror: ${text}${frames ? `\n${frames}` : ''}`);
  };
  page.on('pageerror', onPageError);

  return {
    get errors() { return errors; },
    allow(pattern) { allowed.push(pattern); },
    detach() {
      page.off('console', onConsole);
      page.off('pageerror', onPageError);
    },
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
