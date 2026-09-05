import type { Page, Locator } from '@playwright/test';
import {expect} from "@playwright/test";

/**
 * Match a sidebar directory entry on its full name.
 * v13 renders entries as `<a class="entry-name">`, so a substring match would also hit entries which
 * merely start with the same text (e.g. "qa armor" vs "qa armorItem").
 */
function exactName(name: string): RegExp {
  return new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
}

/**
 * The "Delete" entry of the context menu that was most recently opened.
 *
 * v13 gives directory context menus `fixed: true`, so each one is a popover appended to <body> and
 * they all share `id="context-menu"`. Clicking an entry calls `close()` without awaiting it, and
 * `close()` animates before removing the element - and a menu whose instance is no longer
 * `ui.context` is never closed by the global click handler at all. So more than one can be in the
 * DOM at once. Taking the last one is exact rather than a guess: `_setFixedPosition` appends to
 * <body>, so the newest menu is always last in document order.
 *
 * Targeting `.context-item` rather than the label also avoids matching both the <li> and its <span>.
 */
function deleteMenuItem(page: Page): Locator {
  return page.locator('#context-menu').last().locator('.context-item', { hasText: /^Delete$/ });
}

/**
 * Bring a sidebar directory into view.
 *
 * v13's `Sidebar#_onClickTab` treats a click on the already-active tab as a collapse:
 *
 *     const wasActive = target?.ariaPressed === "true";
 *     super._onClickTab(event);
 *     if ( this.expanded && wasActive ) this.collapse();
 *     else if ( !this.expanded ) this.expand();
 *
 * so clicking unconditionally hides the directory on every second visit. Click only when the tab is
 * not already showing - that click then either switches tabs or expands a collapsed sidebar, and
 * never collapses one.
 */
async function showSidebarTab(page: Page, tab: Locator) {
  const isActive = await tab.getAttribute('aria-pressed') === 'true';
  const isExpanded = await page.locator('#sidebar-content').evaluate(el => el.classList.contains('expanded'));
  if (!isActive || !isExpanded) {
    await tab.click();
  }
  await expect(tab).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#sidebar-content')).toHaveClass(/\bexpanded\b/);
}

/**
 * Right-click a sidebar directory entry, choose Delete, and confirm.
 *
 * The right-click and the menu click are retried as a unit. Deleting a document re-renders the
 * directory, which rebuilds its ContextMenu and detaches an open menu mid-click - Playwright reports
 * that as "element is not stable" followed by "element was detached from the DOM". Re-opening the
 * menu is the only reliable recovery, since the element the click was aimed at no longer exists.
 *
 * Waiting for the entry count to drop at the end is what keeps the *next* removal from racing the
 * re-render: without it, remove() returns as soon as the confirm dialog closes, while the delete and
 * the re-render it triggers are still in flight.
 */
async function deleteDirectoryEntry(page: Page, entries: Locator) {
  const before = await entries.count();
  const confirm = page.getByRole('button', { name: 'Yes' });
  await expect(async () => {
    await entries.first().click({ button: 'right' });
    const item = deleteMenuItem(page);
    await expect(item).toBeVisible();
    await item.click({ timeout: 5_000 });
    await expect(confirm).toBeEnabled({ timeout: 5_000 });
  }).toPass({ timeout: 20_000 });
  await confirm.click();
  await expect(confirm).not.toBeVisible();
  await expect(entries).toHaveCount(before - 1);
}

export class Actors {
  private readonly actorName: string;
  private readonly actorType: string;
  private readonly actorTab: Locator;
  private readonly createActorButton: Locator;
  private readonly createActorNameField: Locator;
  private readonly createActorTypeField: Locator;
  private readonly createActorCreateField: Locator;
  private readonly sheetLocator: Locator;
  private readonly tabCharacteristics: Locator;
  private readonly tabGear: Locator;
  private readonly tabTalents: Locator;
  private readonly tabCrits: Locator;
  private readonly tabInfo: Locator;
  private readonly tabBio: Locator;
  private readonly tabObligation: Locator;
  private readonly tabXp: Locator;
  // vehicle tabs
  private readonly tabWeapons: Locator;
  private readonly tabCrew: Locator;

  constructor(public readonly page: Page, actorName: string, actorType: string) {
    this.actorName = actorName;
    this.actorType = actorType;
    this.actorTab = this.page.getByRole('tab', { name: 'Actors' });
    // the directory's own create button, scoped so it does not collide with the create dialog's
    // submit button - in v13 both are labelled "Create Actor"
    this.createActorButton = this.page.locator('#actors button[data-action="createEntry"]');
    // v13 renders the creation form from templates/sidebar/document-create.html inside a DialogV2.
    // Note that template's own <form id="document-create"> is not in the DOM to scope to: DialogV2
    // injects it into its own <form class="dialog-form">, and the HTML parser drops the nested
    // <form> element while keeping its children.
    // Scope to the most recently opened dialog. ApplicationV2 appends each new window to the DOM,
    // so a create dialog left open by an earlier step can only ever precede the current one.
    const createDialog = this.page.locator('.dialog-form').last();
    this.createActorNameField = createDialog.locator('input[name="name"]');
    this.createActorTypeField = createDialog.locator('select[name="type"]');
    this.createActorCreateField = createDialog.locator('button[data-action="ok"]');
    this.sheetLocator = this.page.locator(
      '.sheet',
      {has: this.page.locator(`text=${this.actorName}`)}
    );
    this.tabCharacteristics =  this.sheetLocator.getByTitle('Characteristics');
    this.tabGear =  this.sheetLocator.getByTitle('Gear & Equipment');
    this.tabTalents =  this.sheetLocator.getByTitle('Talents');
    this.tabCrits =  this.sheetLocator.getByTitle('Critical Injuries');
    this.tabInfo =  this.sheetLocator.getByTitle('Basic Information');
    this.tabBio =  this.sheetLocator.getByTitle('Biography');
    this.tabObligation =  this.sheetLocator.getByTitle('Obligation');
    this.tabXp =  this.sheetLocator.getByTitle('XP log');
    this.tabWeapons =  this.sheetLocator.getByTitle('Weapons and Attachments');
    this.tabCrew = this.sheetLocator.getByTitle('Crew');
  }

  async goToTab() {
    await showSidebarTab(this.page, this.actorTab);
  }

  async create() {
    await this.goToTab();
    // Track our own dialog by count rather than by visibility: a create dialog left open by an
    // earlier step would make a plain "the ok button is gone" check match the wrong window.
    const dialogs = this.page.locator('.dialog-form');
    const openDialogs = await dialogs.count();
    await this.createActorButton.click();
    await expect(dialogs).toHaveCount(openDialogs + 1);
    await this.createActorNameField.fill(this.actorName);
    await this.createActorTypeField.selectOption(this.actorType)
    await this.createActorCreateField.click();
    if (this.actorType !== "vehicle") {
      await expect(this.tabGear).toBeVisible();
    } else {
      await expect(this.tabWeapons).toBeVisible();
    }
    // wait for the create window to close
    await expect(dialogs).toHaveCount(openDialogs);
  }

  async closeSheet() {
    const closeButton = this.page.locator(
      '.sheet',
      {has: this.page.locator(`text=${this.actorName}`)}
    ).locator('.close');
    await closeButton.click({force: true});
  }

  async remove() {
    // ensure we are on the correct tab
    await this.goToTab();
    const entries = this.page.locator('#actors .entry-name').filter({ hasText: exactName(this.actorName) });
    await deleteDirectoryEntry(this.page, entries);
  }

  async switchTab(tabName: string) {
    switch (tabName) {
      case 'characteristics':
        await this.tabCharacteristics.click();
        break;
      case 'gear':
        await this.tabGear.click();
        break;
      case 'talents':
        await this.tabTalents.click();
        break;
      case 'crits':
        await this.tabCrits.click();
        break;
      case 'info':
        await this.tabInfo.click();
        break;
      case 'bio':
        await this.tabBio.click();
        break;
      case 'obligation':
        await this.tabObligation.click();
        break;
      case 'xp':
        await this.tabXp.click();
        break;
      case 'crew':
        await this.tabCrew.click();
        break;
    }
  }

  async checkStat(statName: string, statValue: string) {
    if (statName === 'armor') {
      statName = 'armour'; // ...sigh
    }

    if (statName === 'encumbranceMax') {
      if (this.actorType !== "vehicle") {
        await this.switchTab('gear');
      }
      await expect(this.sheetLocator.locator(`input[name="data.stats.encumbrance.max"]`)).toHaveValue(statValue);
    } else if (statName === 'encumbranceCurrent') {
      if (this.actorType !== "vehicle") {
        await this.switchTab('gear');
      }
      await expect(this.sheetLocator.locator(`input[name="data.stats.encumbrance.value"]`)).toHaveValue(statValue);
    } else if (['woundsMax', 'strainMax'].includes(statName)) {
      await expect(this.sheetLocator.locator(`input[name="data.stats.${statName.replace('Max', '')}.max"]`)).toHaveValue(statValue);
    } else if (['woundsCurrent', 'strainCurrent', 'soak'].includes(statName)) {
      await expect(this.sheetLocator.locator(`input[name="data.stats.${statName}.value"]`)).toHaveValue(statValue);
    } else if (['defense.melee', 'defense.ranged'].includes(statName)) {
      await expect(this.sheetLocator.locator(`input[name="data.stats.${statName.replace('s', 'c')}"]`)).toHaveValue(statValue);
    } else if (['Brawn', 'Agility', 'Intellect', 'Cunning', 'Willpower', 'Presence'].includes(statName)) {
      await expect(this.sheetLocator.locator(`input[name="data.characteristics.${statName}.value"]`)).toHaveValue(statValue);
    } else if (['armour'].includes(statName)) {
      await expect(this.sheetLocator.locator(`input[name="data.stats.${statName}.value"]`)).toHaveValue(statValue);
    } else if (statName === 'customizationHardPoints') {
      await expect(this.sheetLocator.locator(`input[name="data.stats.customizationHardPoints.value"]`)).toHaveValue(statValue);
    }
  }

  async equipItem(itemName: string) {
    await this.sheetLocator.locator('.item', {has: this.page.locator(`text=${itemName}`)}).locator('.toggle-equipped').click();
  }

  async editItem(itemName: string) {
    await this.sheetLocator.locator('.item', {has: this.page.locator(`text=${itemName}`)}).locator('.item-edit').click();
  }

  async checkSkillModifiers(skillName: string, modifierName: string, modifierValue: string) {
    const skillEntry = this.sheetLocator.locator(`[data-ability="${skillName}"]`).locator('.dice-pool.hover');
    await expect(skillEntry).toContainText(`${modifierValue} ${modifierName}`);
  }
}

export class Items {
  private readonly itemName: string;
  private readonly itemType: string;
  private readonly itemTab: Locator;
  private readonly createItemButton: Locator;
  private readonly createItemNameField: Locator;
  private readonly createItemTypeField: Locator;
  private readonly createItemCreateField: Locator;
  private readonly sheetLocator: Locator;
  private readonly tabDescription: Locator;
  private readonly tabModifiers: Locator;
  private readonly tabModifications: Locator;
  private readonly tabConfiguration: Locator;
  private readonly tabLongDesc: Locator;
  private readonly upgradeName: string;

  constructor(public readonly page: Page, itemName: string, itemType: string) {
    this.itemName = itemName;
    this.itemType = itemType;
    this.itemTab = this.page.getByRole('tab', { name: 'Items' });
    // see the Actors equivalents above - v13 labels both the directory button and the dialog's
    // submit button "Create Item", and the creation form now lives in a DialogV2
    this.createItemButton = this.page.locator('#items button[data-action="createEntry"]');
    // Scope to the most recently opened dialog. ApplicationV2 appends each new window to the DOM,
    // so a create dialog left open by an earlier step can only ever precede the current one.
    const createDialog = this.page.locator('.dialog-form').last();
    this.createItemNameField = createDialog.locator('input[name="name"]');
    this.createItemTypeField = createDialog.locator('select[name="type"]');
    this.createItemCreateField = createDialog.locator('button[data-action="ok"]');
    this.sheetLocator = this.page.locator(
      '.sheet',
      {has: this.page.locator(`input[value="${this.itemName}"]`)}
    );
    this.tabDescription =  this.sheetLocator.getByTitle('Description', {exact: true});
    this.tabModifiers =  this.sheetLocator.getByTitle('Modifiers', {exact: true});
    this.tabModifications =  this.sheetLocator.getByText('Modifications', {exact: true});
    this.tabConfiguration = this.sheetLocator.getByTitle('Configuration');
    this.tabLongDesc =  this.sheetLocator.getByTitle('Long Description and Sources', {exact: true});
    if (this.itemType === 'forcepower' || this.itemType === 'signatureability') {
      this.upgradeName = 'upgrade';
    } else {
      this.upgradeName = 'talent';
    }
  }

  async goToTab() {
    await showSidebarTab(this.page, this.itemTab);
  }

  async create() {
    await this.goToTab();
    // Track our own dialog by count rather than by visibility: a create dialog left open by an
    // earlier step would make a plain "the ok button is gone" check match the wrong window.
    const dialogs = this.page.locator('.dialog-form');
    const openDialogs = await dialogs.count();
    await this.createItemButton.click();
    await expect(dialogs).toHaveCount(openDialogs + 1);
    await this.createItemNameField.fill(this.itemName);
    await this.createItemTypeField.selectOption(this.itemType)
    await this.createItemCreateField.click();
    // wait for the creation window to close
    await expect(dialogs).toHaveCount(openDialogs);
  }

  async closeSheet() {
    await new Promise(resolve => setTimeout(resolve, 505));
    await this.sheetLocator.locator('.close').click();
    await expect(this.sheetLocator).not.toBeVisible();
  }

  async remove() {
    // ensure we are on the correct tab
    await this.goToTab();
    const entries = this.page.locator('#items .entry-name').filter({ hasText: exactName(this.itemName) });
    await deleteDirectoryEntry(this.page, entries);
  }

  async switchTab(tabName: string) {
    // TODO: only armor tabs are here atm
    switch (tabName) {
      case 'desc':
        await this.tabDescription.click();
        break;
      case 'modifiers':
        await this.tabModifiers.click();
        break;
      case 'modifications':
        await this.tabModifications.click();
        break;
      case 'configuration':
        await this.tabConfiguration.click();
        break;
      case 'longDesc':
        await this.tabLongDesc.click();
        break;
    }
  }

  async setStat(statName: string, statValue: string) {
    await this.switchTab('modifiers');
    // friggin brits :p
    if (statName === "defense") {
      statName = 'defence';
    }

    if (['defence', 'soak', 'encumbrance', 'hardpoints', 'rarity'].includes(statName)) {
      await this.setField(this.sheetLocator.locator(`input[name="data.${statName}.value"]`), statValue);
    } else if (['Wounds', 'Strain', 'Brawn', 'Agility', 'Intellect', 'Cunning', 'Willpower', 'Presence'].includes(statName)) {
      await this.setField(this.sheetLocator.locator(`input[name="data.attributes.${statName}.value"]`), statValue);
    }
  }

  /**
   * Fill a field on an ApplicationV1 sheet and make sure the value survives.
   * Under v13 the re-render from a previous edit can land on top of the next
   * one and revert it, which silently loses whichever value was written last,
   * so re-apply until it sticks.
   */
  private async setField(field: Locator, value: string) {
    await expect(async () => {
      // Clear explicitly rather than relying on fill() to replace the contents: Foundry can end up
      // with the old and the new value concatenated, so the field has to be empty before the value
      // goes in. Selecting and deleting also makes a retry converge instead of compounding.
      await field.click();
      await field.press('ControlOrMeta+a');
      await field.press('Delete');
      await field.fill(value);
      await field.blur();
      // give any in-flight re-render a chance to clobber the value before we trust it
      await this.page.waitForTimeout(300);
      await expect(field).toHaveValue(value, { timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
  }

  async checkStat(statName: string, statValue: string) {
    await this.switchTab('modifiers');
    // friggin brits :p
    if (statName === "defense") {
      statName = 'defence';
    }

    if (['defense', 'soak', 'encumbrance', 'hardpoints', 'rarity'].includes(statName)) {
      await expect(this.sheetLocator.locator(`input[name="data.${statName}.value"]`)).toHaveValue(statValue);
    } else if (['Wounds', 'Strain', 'Brawn', 'Agility', 'Intellect', 'Cunning', 'Willpower', 'Presence'].includes(statName)) {
      await this.sheetLocator.locator(`input[name="data.attributes.${statName}.value"]`).fill(statValue);
    }
  }

  async addDirectModifier(modifierType: string, modifier: string, modifierValue: string) {
    const modifierElement = '.tab.attributes.active > .attributes-header > .attribute-control';
    // this function fails if there's >1 mod on the same item, so be aware of this
    if (this.itemType === "forcepower") {
      await expect(this.sheetLocator.locator('.talent-action.hover').locator('.fa-cog')).toBeEnabled();
      await this.sheetLocator.locator('.talent-action.hover').locator('.fa-cog').click();
      const popoutPage = this.page.locator('#popout-modifiers');
      await expect(popoutPage.locator('.fas.fa-plus')).toBeEnabled();
      await popoutPage.locator('.fas.fa-plus').click();
      await popoutPage.locator('.modtype').selectOption(modifierType);
      await popoutPage.locator('.mod').selectOption(modifier);
      await this.setField(popoutPage.locator('.modvalue'), modifierValue);
      await popoutPage.locator('.close').click();
      await expect(popoutPage).not.toBeVisible();
    } else {
      await expect(this.sheetLocator.locator(modifierElement)).toBeEnabled();
      await this.sheetLocator.locator(modifierElement).click();
      await this.sheetLocator.locator('.modtype').selectOption(modifierType);
      await this.sheetLocator.locator('.mod').selectOption(modifier);
      await this.setField(this.sheetLocator.locator('.modvalue'), modifierValue);
    }
  }

  async addTalentModifier(talentNumber: string, modifierType: string, modifier: string, modifierValue: string) {
    await this.sheetLocator.locator(`#${this.upgradeName}${talentNumber}`).locator('.fas.fa-cog').click();
    const popoutPage = this.page.locator('.flat_editor');
    await expect(popoutPage.getByText('Base Mods')).toBeVisible();
    await popoutPage.getByText('Base Mods').click();
    await expect(popoutPage.locator('.fas.fa-plus')).toBeEnabled();
    await popoutPage.locator('.fas.fa-plus').click();
    await popoutPage.locator('.modtype').selectOption(modifierType);
    await popoutPage.locator('.mod').selectOption(modifier);
    await this.setField(popoutPage.locator('.modvalue'), modifierValue);

    await new Promise(resolve => setTimeout(resolve, 505));
    await popoutPage.locator('.close').click();
    await expect(popoutPage.locator('.close')).not.toBeVisible();
  }

  async learnTalent(talentNumber: string) {
    // TODO: this should probably open the sheet as well
    await this.sheetLocator.locator(`#${this.upgradeName}${talentNumber}`).getByRole('checkbox').check();
  }

  async editItem(itemName: string) {
    await this.sheetLocator.locator('.item', {has: this.page.locator(`text=${itemName}`)}).locator('.item-edit').click();
  }

  async setRank(rank: string) {
    await this.switchTab('configuration');
    await this.setField(this.sheetLocator.locator('input[name="data.rank"]'), rank);
    await this.switchTab('modifiers');
  }

  async enableMod(modNumber: string) {
    await this.page.locator(`input[name="system.itemmodifier[${modNumber}].system.active"]`).click();
  }
}
