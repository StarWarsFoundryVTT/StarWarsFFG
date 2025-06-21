import type { Page, Locator } from '@playwright/test';
import {expect} from "@playwright/test";

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
    this.createActorButton = this.page.getByRole('button', { name: 'Create Actor' });
    this.createActorNameField = this.page.getByRole('textbox', { name: 'Character' });
    this.createActorTypeField = this.page.getByRole('combobox');
    this.createActorCreateField = this.page.getByRole('button', { name: 'Create New Actor' });
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
    await this.actorTab.click();
  }

  async create() {
    await this.goToTab();
    await this.createActorButton.click();
    await this.createActorNameField.fill(this.actorName);
    await this.createActorTypeField.selectOption(this.actorType)
    await this.createActorCreateField.click();
    if (this.actorType !== "vehicle") {
      await expect(this.tabGear).toBeVisible();
    } else {
      await expect(this.tabWeapons).toBeVisible();
    }
    // wait for the create window to close
    await expect(this.createActorCreateField).not.toBeVisible();
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
    await this.page.locator('#actors').getByRole('heading', { name: this.actorName }).click({button: 'right'});
    await this.page.getByText('Delete').click();
    await this.page.getByRole('button', { name: 'Yes' }).click();
    await expect(this.page.getByRole('button', { name: 'Yes' })).not.toBeVisible();
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
    this.createItemButton = this.page.getByRole('button', { name: ' Create Item' });
    this.createItemNameField = this.page.getByRole('textbox', { name: 'Ability' });
    this.createItemTypeField = this.page.locator('select[name="type"]');
    this.createItemCreateField = this.page.getByRole('button', { name: 'Create New Item' });
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
    await this.itemTab.click();
  }

  async create() {
    await this.goToTab();
    await this.createItemButton.click();
    await expect(this.page.locator('input[placeholder="Ability"]')).toBeVisible();
    await this.createItemNameField.fill(this.itemName);
    await this.createItemTypeField.selectOption(this.itemType)
    await this.createItemCreateField.click();
    // wait for the creation window to close
    await expect(this.createItemCreateField).not.toBeVisible();
  }

  async closeSheet() {
    await new Promise(resolve => setTimeout(resolve, 505));
    await this.sheetLocator.locator('.close').click();
    await expect(this.sheetLocator).not.toBeVisible();
  }

  async remove() {
    // ensure we are on the correct tab
    await this.goToTab();
    await this.page.locator('#items').getByRole('heading', { name: this.itemName }).click({button: 'right'});
    await expect(this.page.getByText('Delete')).toBeEnabled();
    await this.page.getByText('Delete').click();
    await expect(this.page.getByRole('button', { name: 'Yes' })).toBeEnabled();
    await this.page.getByRole('button', { name: 'Yes' }).click();
    await expect(this.page.getByRole('button', { name: 'Yes' })).not.toBeVisible();
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
      await this.sheetLocator.locator(`input[name="data.${statName}.value"]`).fill(statValue);
    } else if (['Wounds', 'Strain', 'Brawn', 'Agility', 'Intellect', 'Cunning', 'Willpower', 'Presence'].includes(statName)) {
      await this.sheetLocator.locator(`input[name="data.attributes.${statName}.value"]`).fill(statValue);
    }
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
    // this function fails if there's >1 mod on the same item, so be aware of this
    if (this.itemType === "forcepower") {
      await expect(this.sheetLocator.locator('.talent-action.hover').locator('.fa-cog')).toBeEnabled();
      await this.sheetLocator.locator('.talent-action.hover').locator('.fa-cog').click();
      const popoutPage = this.page.locator('#popout-modifiers');
      await expect(popoutPage.locator('.fas.fa-plus')).toBeEnabled();
      await popoutPage.locator('.fas.fa-plus').click();
      await popoutPage.locator('.modtype').selectOption(modifierType);
      await popoutPage.locator('.mod').selectOption(modifier);
      await popoutPage.locator('.modvalue').fill(modifierValue);
      await popoutPage.locator('.close').click();
      await expect(popoutPage).not.toBeVisible();
    } else {
      await expect(this.sheetLocator.locator('.fas.fa-plus')).toBeEnabled();
      await this.sheetLocator.locator('.fas.fa-plus').click();
      await this.sheetLocator.locator('.modtype').selectOption(modifierType);
      await this.sheetLocator.locator('.mod').selectOption(modifier);
      await this.sheetLocator.locator('.modvalue').fill(modifierValue);
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
    await popoutPage.locator('.modvalue').fill(modifierValue);

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
    await this.sheetLocator.locator('input[name="data.rank"]').fill(rank);
    await this.switchTab('modifiers');
  }

  async enableMod(modNumber: string) {
    await this.page.locator(`input[name="system.itemmodifier[${modNumber}].system.active"]`).click();
  }
}
