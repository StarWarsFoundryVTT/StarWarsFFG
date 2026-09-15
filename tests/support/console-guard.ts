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
  /** Whatever ui.notifications was asked to post, with its caller. Clears as it reads. */
  notifications(): Promise<string[]>;
  /** Throw if anything was collected. Runs automatically after each test. */
  assertClean(notifications?: string[]): void;
  /** Allow an error the test expects. */
  allow(pattern: string | RegExp): void;
  /** Stop listening. The page outlives the test, so listeners would otherwise pile up. */
  detach(): void;
}

/**
 * Record what `ui.notifications` was asked to say, and who asked.
 */
export async function recordNotifications(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as any;
    const queue = ui?.notifications;
    // Deliberately before the array is created: an armed recorder is what the array means, and
    // one created without a wrapper would make every later call here think it had nothing to do.
    if (!queue?.notify || queue.notify.__qaWrapped) return;

    w.__qaNotifications ??= [];
    const original = queue.notify.bind(queue);
    const wrapped = (message: string, type: string, options: unknown) => {
      const caller = (new Error().stack ?? '').split('\n').slice(2, 5).join(' | ');
      w.__qaNotifications.push(`${type ?? 'info'}: ${message}  <- ${caller}`);
      try {
        return original(message, type, options);
      } catch (err: any) {
        // the renderer failing must not take the caller down with it
        w.__qaNotifications.push(`(the renderer threw: ${err?.message ?? err})`);
        return null;
      }
    };
    wrapped.__qaWrapped = true;
    queue.notify = wrapped;
  });
}

export async function installConsoleGuard(page: Page, testInfo: TestInfo): Promise<ConsoleGuard> {
  const errors: string[] = [];
  const allowed: (string | RegExp)[] = [];
  // Awaited: a test that reads notifications is asserting on what this collects, and a recorder
  // that was still being installed reads as "nothing was posted".
  await recordNotifications(page);

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
    async notifications() {
      const read = await page.evaluate(() => {
        const w = window as any;
        const armed = Boolean((ui?.notifications?.notify as any)?.__qaWrapped);
        const seen = (w.__qaNotifications ?? []) as string[];
        w.__qaNotifications = [];
        return { armed, seen };
      }).catch(() => ({ armed: true, seen: [] as string[] }));

      // An empty list from a page that was not recording is not an empty list of notifications,
      // and a test that asserts on one deserves to be told the difference.
      if (!read.armed) {
        throw new Error(
          'Notifications were not being recorded on this page, so nothing was collected. The ' +
          'page reloaded after the guard was installed - call recordNotifications(page) again ' +
          'after a reload that the harness does not do for you.',
        );
      }
      return read.seen;
    },
    assertClean(notifications: string[] = []) {
      // don't pile on a test that already failed for its own reason
      if (testInfo.status !== testInfo.expectedStatus) return;
      if (errors.length === 0) return;
      const list = errors.map((e) => `  - ${e}`).join('\n');
      const posted = notifications.length
        ? `\n\nNotifications posted during this test:\n` +
          notifications.map((n) => `  - ${n}`).join('\n')
        : '';
      throw new Error(
        `The page logged ${errors.length} error(s) during this test:\n${list}${posted}\n\n` +
        'If one is expected, call consoleGuard.allow(...) in the test.',
      );
    },
  };
}
