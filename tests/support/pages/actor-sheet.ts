import { expect, type Page } from '@playwright/test';

/**
 * Reads from a rendered actor sheet.
 */

/** Open an actor's sheet and switch to the tab holding the skill table. */
async function showSkills(page: Page, actorName: string) {
  const sheet = page.locator('.sheet', { has: page.locator(`text=${actorName}`) }).last();
  const tab = sheet.getByTitle('Characteristics');
  if (await tab.isVisible().catch(() => false)) await tab.click();
  return sheet;
}

/**
 * The dice-pool summary shown against a skill, e.g. "3 boost" or "1 Advantage".
 */
export async function skillDicePool(page: Page, actorName: string, skill: string): Promise<string> {
  const sheet = await showSkills(page, actorName);
  const entry = sheet.locator(`[data-ability="${skill}"]`).locator('.dice-pool.hover').first();
  await expect(entry).toBeAttached();
  return (await entry.textContent()) ?? '';
}

/**
 * Where each stat is rendered on the sheet.
 */
const STAT_INPUT: Record<string, string> = {
  'Soak': 'data.stats.soak.value',
  'Defence-Melee': 'data.stats.defence.melee',
  'Defence-Ranged': 'data.stats.defence.ranged',
  'Wounds': 'data.stats.wounds.max',
  'Strain': 'data.stats.strain.max',
  'Encumbrance': 'data.stats.encumbrance.value',
  'EncumbranceMax': 'data.stats.encumbrance.max',
  'ForcePool': 'data.stats.forcePool.max',
  'Brawn': 'data.characteristics.Brawn.value',
  'Agility': 'data.characteristics.Agility.value',
  'Intellect': 'data.characteristics.Intellect.value',
  'Cunning': 'data.characteristics.Cunning.value',
  'Willpower': 'data.characteristics.Willpower.value',
  'Presence': 'data.characteristics.Presence.value',
  // vehicles
  'Armor': 'data.stats.armour.value',
  'Armour': 'data.stats.armour.value',
  'Speed': 'data.stats.speed.max',
  'SpeedCurrent': 'data.stats.speed.value',
  'Handling': 'data.stats.handling.value',
  'VehicleEncumbrance': 'data.stats.encumbrance.value',
  'CustomizationHardPoints': 'data.stats.customizationHardPoints.value',
};

/** Stats that only render once a particular tab is showing. */
const STAT_TAB: Record<string, string> = {
  'Encumbrance': 'Gear & Equipment',
  'EncumbranceMax': 'Gear & Equipment',
};

/**
 * Read a stat off the rendered actor sheet.
 *
 * One-shot read of a surface that updates asynchronously - Foundry re-renders after an item's
 * effects change, and this can catch the previous render. Prefer `consumers.stat()`, which reads
 * the document first and only falls back here for values the document does not hold.
 */
export async function sheetStat(
  page: Page, actorName: string, stat: string,
): Promise<number | null> {
  const name = STAT_INPUT[stat];
  if (!name) throw new Error(`No sheet input mapped for "${stat}". Known: ${Object.keys(STAT_INPUT).join(', ')}.`);

  const sheet = page.locator('.sheet', { has: page.locator(`text=${actorName}`) }).last();

  const tabTitle = STAT_TAB[stat];
  if (tabTitle) {
    const tab = sheet.getByTitle(tabTitle);
    if (await tab.isVisible().catch(() => false)) await tab.click();
  }

  const input = sheet.locator(`input[name="${name}"]`).first();
  if (!(await input.count())) return null;
  const value = await input.inputValue();
  return value === '' ? null : Number(value);
}
