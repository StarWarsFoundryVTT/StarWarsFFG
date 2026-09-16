import { type Page } from '@playwright/test';

/**
 * Reads from a rendered item sheet.
 */

/** The item's own window, by the name in its title bar. */
function sheet(page: Page, itemName: string) {
  return page.locator('.sheet.item', { has: page.locator(`text=${itemName}`) }).last();
}

/** Switch to one of the sheet's tabs, named as the template names it. */
export async function showTab(page: Page, itemName: string, tab: string) {
  const window = sheet(page, itemName);
  const control = window.locator(`.sheet-tabs [data-tab="${tab}"]`).first();
  if (await control.isVisible().catch(() => false)) await control.click();
  return window;
}

/**
 * The books listed on the sources tab.
 */
export async function sources(page: Page, itemName: string): Promise<string[]> {
  const window = await showTab(page, itemName, 'sources');
  const listed = window.locator('.tab.sources li');
  return (await listed.allTextContents()).map((text) => text.trim());
}

/** The control that adds a source, which is what an item with none should still offer. */
export function addSourceControl(page: Page, itemName: string) {
  return sheet(page, itemName).locator('.tab.sources .source-control[data-action="add"]');
}

/** A field's value on one particular sheet window, named as the form names it. */
export async function fieldValue(page: Page, windowId: string, name: string): Promise<string> {
  const field = page.locator(`#${windowId} [name="${name}"]`).first();
  const there = await field.waitFor({ state: 'attached', timeout: 5000 })
    .then(() => true).catch(() => false);
  if (!there) throw new Error(`That sheet has no "${name}" field to read.`);
  return field.inputValue();
}

/**
 * Type a value into one sheet window's field, as a player editing that form would.
 */
export async function setFieldValue(
  page: Page, windowId: string, name: string, value: string,
): Promise<void> {
  const field = page.locator(`#${windowId} [name="${name}"]`).first();
  const there = await field.waitFor({ state: 'visible', timeout: 5000 })
    .then(() => true).catch(() => false);
  if (!there) throw new Error(`That sheet has no "${name}" field to write to.`);

  await field.fill(value);
  await field.blur();
}
