import type { Page } from '@playwright/test';

/**
 * World settings a test needs before it runs.
 */

export type ProfileName = 'default' | 'genesys' | 'custom-skills' | 'manual-calc';

/** Settings each profile applies. Anything unlisted is left at the world's current value. */
const PROFILES: Record<ProfileName, Record<string, unknown>> = {
  /** Stock Star Wars rules. What most tests run under. */
  default: {
    dicetheme: 'starwars',
    skilltheme: 'starwars',
    enableSoakCalc: true,
    enableForceDie: true,
  },

  /** Genesys dice and story points, which swaps symbols and disables Force dice. */
  genesys: {
    dicetheme: 'genesys',
    enableForceDie: false,
  },

  /** A renamed skill list, for the reports where modifiers stop resolving against custom skills. */
  'custom-skills': {
    dicetheme: 'starwars',
    skilltheme: 'custom-qa',
  },

  /** Auto soak calculation off, which is what #1976 needs to reproduce. */
  'manual-calc': {
    enableSoakCalc: false,
  },
};

/**
 * Apply a profile.
 */
export async function applyProfile(page: Page, name: ProfileName): Promise<void> {
  const settings = PROFILES[name];
  if (!settings) {
    throw new Error(`No profile "${name}". Known: ${Object.keys(PROFILES).join(', ')}.`);
  }

  await page.evaluate(async (settings) => {
    for (const [key, value] of Object.entries(settings)) {
      // a setting the world doesn't have registered would throw and take the run with it
      if (!game.settings.settings.has(`starwarsffg.${key}`)) continue;
      if (game.settings.get('starwarsffg', key) === value) continue;
      await game.settings.set('starwarsffg', key, value);
    }
  }, settings);
}

/** What the world is currently set to, for diagnostics when a test fails oddly. */
export async function currentProfile(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(() => {
    const keys = ['dicetheme', 'skilltheme', 'enableSoakCalc', 'enableForceDie'];
    return Object.fromEntries(
      keys
        .filter((k) => game.settings.settings.has(`starwarsffg.${k}`))
        .map((k) => [k, game.settings.get('starwarsffg', k)]),
    );
  });
}
