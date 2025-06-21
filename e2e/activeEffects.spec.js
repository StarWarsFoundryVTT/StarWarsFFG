// @ts-check
import { test, expect } from '@playwright/test';
import {Actors, Items} from "../playwright/fixtures";

test.beforeEach(async ({ page }) => {
  await page.goto('http://overlord.wrycu.com:12121/game/');
  await expect(page.getByText('Loading')).toBeVisible();
  await expect(page.getByText('Loading')).not.toBeVisible();
});

// weapon fails
// embedded armor fails
// embedded weapon fails

// TODO: most of these tests should be extended to confirm that they still work if they're done while the item is on an actor
// TODO: weapon stat -> encumbrance does not generate an activeEffect like it should
// TODO: other weapon mods appear to not create activeEffects like they should
// TODO: creating an AE on a mod does not sync properly to "disabled", meaning it's applied right away
// TODO: these tests do not really test equipping and installing stuff
// TODO: the modifier button directly on the force power currently doesn't work
/**
 * Character tests
 */
test('armor applies correctly', async ({ page }) => {
  // create items
  const armorActorName = "armorActor";
  const armorName = "qa armor"
  const armorActor = new Actors(page, armorActorName, "character");
  await armorActor.create();
  const armor = new Items(page, armorName, "armour");
  await armor.create();

  // set stats on the armor
  await armor.setStat('encumbrance', '5');
  await armor.setStat('defense', '1');
  await armor.setStat('soak', '2');
  await armor.checkStat('encumbrance', '5');
  await armor.checkStat('defense', '1');
  await armor.checkStat('soak', '2');
  await armor.closeSheet();

  // drag and drop the armor onto the character
  await armorActor.switchTab('gear');
  await page.getByRole('listitem').filter({ hasText: armorName }).dragTo(page.locator('.tab.items.active'));
  await armorActor.checkStat('encumbranceCurrent', '5');
  await armorActor.checkStat('soak', '0');
  await armorActor.checkStat('defense.ranged', '0');

  // equip the armor and validate the stats are what we expect
  await armorActor.equipItem(armorName);
  await armorActor.checkStat('encumbranceCurrent', '2');
  await armorActor.checkStat('defense.ranged', '1');
  await armorActor.checkStat('defense.melee', '1');
  await armorActor.checkStat('soak', '2');

  // clean up
  await armorActor.remove();
  await armor.remove();
});

test('career applies correctly', async ({ page }) => {
  const actorName = "careerActor";
  const careerName = "qa career";
  const careerActor = new Actors(page, actorName, "character");
  await careerActor.create();
  const career = new Items(page, careerName, "career");
  await career.create();

  // add a mod
  await career.addDirectModifier('Skill Add Advantage', 'Gunnery', '1');
  await career.closeSheet();

  // drag and drop the armor onto the character
  // (expect there to not be text, then, after the drop, expect there to be text)
  await careerActor.switchTab('gear');
  await page.getByRole('listitem').filter({ hasText: careerName }).dragTo(page.locator('.tab.items.active'));
  await careerActor.switchTab('characteristics');
  await careerActor.checkSkillModifiers('Gunnery', 'Advantage', '1');

  // clean up
  await careerActor.remove();
  await career.remove();
});

test('critical injury applies correctly', async ({ page }) => {
  const actorName = "qa criticalInjuryActor";
  const itemName = "qa criticalInjuryItem";
  const critActor = new Actors(page, actorName, "character");
  await critActor.create();
  const crit = new Items(page, itemName, "criticalinjury");
  await crit.create();

  // add a mod
  await crit.addDirectModifier('Skill Add Success', 'Melee', '2');
  await crit.closeSheet();

  // drag and drop the armor onto the character
  // (expect there to not be text, then, after the drop, expect there to be text)
  await critActor.switchTab('gear');
  await page.getByRole('listitem').filter({ hasText: itemName }).dragTo(page.locator('.tab.items.active'));
  await critActor.switchTab('characteristics');
  await critActor.checkSkillModifiers('Melee', 'Success', '2');

  // clean up
  await critActor.remove();
  await crit.remove();
});

test('force power applies correctly', async ({ page }) => {
  const actorName = "qa forcePowerActor";
  const itemName = "qa forcePowerItem";
  const fpActor = new Actors(page, actorName, "character");
  await fpActor.create();
  const fp = new Items(page, itemName, "forcepower");
  await fp.create();

  // add a mod

  //await fp.addDirectModifier('')
  await fp.addTalentModifier('0', 'Skill Add Despair', 'Cool', '3');
  await fp.learnTalent('1');
  await fp.addTalentModifier('1', 'Skill Add Success', 'Computers', '2');
  await fp.closeSheet();

  // drag and drop onto the character
  await page.getByRole('listitem').filter({ hasText: itemName }).dragTo(page.locator('.character-details-table'));
  await fpActor.switchTab('characteristics');
  await fpActor.checkSkillModifiers('Computers', 'Success', '2');

  // clean up
  await fpActor.remove();
  await fp.remove();
});

test('gear applies correctly', async ({ page }) => {
  const actorName = "qa gearActor";
  const gearName = "qa gearItem";
  const gearActor = new Actors(page, actorName, "character");
  await gearActor.create();
  const gear = new Items(page, gearName, "gear");
  await gear.create();

  // add a mod
  await gear.addDirectModifier('Skill Add Advantage', 'Charm', '2');
  await gear.closeSheet();

  // drag and drop the armor onto the character
  // (expect there to not be text, then, after the drop, expect there to be text)
  await gearActor.switchTab('gear');
  await page.getByRole('listitem').filter({ hasText: gearName }).dragTo(page.locator('.tab.items.active'));
  await gearActor.switchTab('characteristics');
  await gearActor.checkSkillModifiers('Charm', 'Advantage', '2');

  // clean up
  await gearActor.remove();
  await gear.remove();
});

test('signature ability applies correctly', async ({ page }) => {
  const actorName = "qa signatureAbilityActor";
  const itemName = "qa signatureAbilityItem";
  const saActor = new Actors(page, actorName, "character");
  await saActor.create();
  const sa = new Items(page, itemName, "signatureability");
  await sa.create();

  // add a mod
  //await sa.addDirectModifier('')
  await sa.addTalentModifier('0', 'Skill Add Despair', 'Cool', '3');
  await sa.learnTalent('1');
  await sa.addTalentModifier('1', 'Skill Add Success', 'Medicine', '1');
  await sa.closeSheet();

  // drag and drop onto the character
  await page.getByRole('listitem').filter({ hasText: itemName }).dragTo(page.locator('.character-details-table'));
  await saActor.switchTab('characteristics');
  await saActor.checkSkillModifiers('Medicine', 'Success', '1');

  // clean up
  await saActor.remove();
  await sa.remove();
});

test('specialization applies correctly', async ({ page }) => {
const actorName = "qa specActor";
  const itemName = "qa specItem";
  const spActor = new Actors(page, actorName, "character");
  await spActor.create();
  const sp = new Items(page, itemName, "specialization");
  await sp.create();

  // add a mod
  //await sp.addDirectModifier('')
  await sp.addTalentModifier('0', 'Skill Add Despair', 'Cool', '3');
  await sp.learnTalent('1');
  await sp.addTalentModifier('1', 'Skill Boost', 'Perception', '3');
  await sp.closeSheet();

  // drag and drop onto the character
  await page.getByRole('listitem').filter({ hasText: itemName }).dragTo(page.locator('.character-details-table'));
  await spActor.switchTab('characteristics');
  await spActor.checkSkillModifiers('Perception', 'boost', '3');

  // clean up
  await spActor.remove();
  await sp.remove();
});

test('species applies correctly', async ({ page }) => {
  // create items
  const speciesActorName = "qa speciesActor";
  const speciesItemName = "qa speciesItem"
  const speciesActor = new Actors(page, speciesActorName, "character");
  await speciesActor.create();
  const speciesItem = new Items(page, speciesItemName, "species");
  await speciesItem.create();

  // set stats on the speciesItem
  await speciesItem.setStat('Wounds', '10');
  await speciesItem.setStat('Strain', '20');
  await speciesItem.setStat('Brawn', '1');
  await speciesItem.setStat('Agility', '2');
  await speciesItem.setStat('Intellect', '3');
  await speciesItem.setStat('Cunning', '3');
  await speciesItem.setStat('Willpower', '2');
  await speciesItem.setStat('Presence', '1');
  await speciesItem.checkStat('Wounds', '10');
  await speciesItem.checkStat('Strain', '20');
  await speciesItem.checkStat('Brawn', '1');
  await speciesItem.checkStat('Agility', '2');
  await speciesItem.checkStat('Intellect', '3');
  await speciesItem.checkStat('Cunning', '3');
  await speciesItem.checkStat('Willpower', '2');
  await speciesItem.checkStat('Presence', '1');
  await speciesItem.closeSheet();

  // drag and drop the speciesItem onto the character
  await speciesActor.switchTab('characteristics');
  await page.getByRole('listitem').filter({ hasText: speciesItemName }).dragTo(page.locator('.character-details-table'));
  await speciesActor.checkStat('woundsMax', '11'); // brawn + wounds
  await speciesActor.checkStat('strainMax', '22'); // willpower + strain
  // TODO: this should be passing, but is not. there's a bug where soak is not being increased by Brawn
  //await speciesActor.checkStat('soak', '1'); // brawn
  await speciesActor.checkStat('Brawn', '1');
  await speciesActor.checkStat('Agility', '2');
  await speciesActor.checkStat('Intellect', '3');
  await speciesActor.checkStat('Cunning', '3');
  await speciesActor.checkStat('Willpower', '2');
  await speciesActor.checkStat('Presence', '1');

  // clean up
  await speciesActor.remove();
  await speciesItem.remove();
});

test('talent applies correctly', async ({ page }) => {
  const actorName = "qa talentActor";
  const itemName = "qa talentItem";
  const talentActor = new Actors(page, actorName, "character");
  await talentActor.create();
  const talent = new Items(page, itemName, "talent");
  await talent.create();

  // add a mod
  await talent.addDirectModifier('Stat', 'Strain', '3');
  await talent.closeSheet();

  // drag and drop the talent onto the character
  await page.getByRole('listitem').filter({ hasText: itemName }).dragTo(page.locator('.character-details-table'));
  await talentActor.checkStat('Strain', '3');

  // clean up
  await talentActor.remove();
  await talent.remove();
});

test('weapon applies correctly', async ({ page }) => {
  const actorName = "qa weaponActor";
  const itemName = "qa weaponItem";
  const weaponActor = new Actors(page, actorName, "character");
  await weaponActor.create();
  const weapon = new Items(page, itemName, "weapon");
  await weapon.create();

  // add a mod
  await weapon.switchTab('modifiers');
  await weapon.setStat('encumbrance', '5');
  await weapon.addDirectModifier('Weapon Stat', 'encumbrance', '3');
  await weapon.closeSheet();

  // drag and drop the weapon onto the character
  await weaponActor.switchTab('gear');
  await page.getByRole('listitem').filter({ hasText: itemName }).dragTo(page.locator('.tab.items.active'));
  await weaponActor.checkStat('encumbranceCurrent', '8'); // weapon plus modifier

  // clean up
  await weaponActor.remove();
  await weapon.remove();
});

test('embedded armor applies correctly', async ({ page }) => {
  const actorName = "qa embeddedArmorActor";
  const baseItemName = "qa armorItem";
  const attachmentName = "qa embeddedAttachment";
  const modName = "qa embeddedMod";
  const embeddedActor = new Actors(page, actorName, "character");
  await embeddedActor.create();
  const armor = new Items(page, baseItemName, "armour");
  await armor.create();
  const armorAttachment = new Items(page, attachmentName, "itemattachment");
  await armorAttachment.create();

  await armorAttachment.addDirectModifier('Stat', 'Soak', '1');
  await armorAttachment.closeSheet();
  // drag the attachment to the armor
  await page.getByRole('listitem').filter({ hasText: attachmentName }).dragTo(page.locator('.attachments.items'));
  await armor.closeSheet();
  await embeddedActor.switchTab('gear');
  await embeddedActor.checkStat('soak', '0');
  await page.getByRole('listitem').filter({ hasText: baseItemName }).dragTo(page.locator('.tab.items.active'));
  // TODO: this should probably be 0, because the AE should not apply until equipped
  await embeddedActor.checkStat('soak', '1');

  // okay, add the mod
  const weaponMod = new Items(page, modName, "itemmodifier");
  await weaponMod.create();
  await weaponMod.addDirectModifier('Stat', 'Defence-Melee', '1');
  await weaponMod.setRank('1');
  await weaponMod.closeSheet();
  await embeddedActor.editItem(baseItemName);
  await page.getByRole('listitem').filter({ hasText: modName }).dragTo(page.locator('.attachments.items'));
  await armor.closeSheet();
  await embeddedActor.checkStat('defense.melee', '1');
  await embeddedActor.checkStat('defence.ranged', '0');
  await embeddedActor.checkStat('soak', '1');

  // okay, now add the mod to the attachment
  await embeddedActor.editItem(baseItemName);
  // let the animation play out
  await new Promise(resolve => setTimeout(resolve, 200));
  //await armor.removeItem(attachmentName);
  await armor.editItem(attachmentName);
  // let the animation play out
  await new Promise(resolve => setTimeout(resolve, 200));
  const embeddedAttachment = new Items(page, attachmentName, "itemattachment");
  // this is a bit confusing, but 'armorAttachment' now refers to the embedded instance
  await page.getByText('Modifications', {exact: true}).click();
  // let the animation play out
  await new Promise(resolve => setTimeout(resolve, 200));
  await page.locator('.directory-item').filter({ hasText: modName }).dragTo(page.locator('.content'));
  await embeddedAttachment.enableMod('0');
  await page.getByText('Basics', {exact: true}).click();
  await embeddedAttachment.closeSheet();
  await armor.closeSheet();
  await embeddedActor.equipItem(baseItemName);
  await embeddedActor.checkStat('defense.melee', '2');
  await embeddedActor.checkStat('defence.ranged', '0');

  // clean up
  await embeddedActor.remove();
  await armor.remove();
  await armorAttachment.remove();
  await weaponMod.remove();
});

test('embedded weapons applies correctly', async ({ page }) => {
  const actorName = "qa embeddedWeaponActor";
  const baseItemName = "qa embeddedWeaponItem";
  const attachmentName = "qa embeddedAttachment";
  const modName = "qa embeddedMod";
  const embeddedActor = new Actors(page, actorName, "character");
  await embeddedActor.create();
  const weapon = new Items(page, baseItemName, "weapon");
  await weapon.create();
  const weaponAttachment = new Items(page, attachmentName, "itemattachment");
  await weaponAttachment.create();
  //const weaponMod = new Items(page, modName, "itemmod");
  //await weaponMod.create();
  await weaponAttachment.addDirectModifier('Stat', 'Soak', '1');
  await weaponAttachment.closeSheet();
  // drag the attachment to the weapon
  await page.getByRole('listitem').filter({ hasText: attachmentName }).dragTo(page.locator('.attachments.items'));
  await weapon.closeSheet();
  await embeddedActor.switchTab('gear');
  await embeddedActor.checkStat('soak', '0');
  await page.getByRole('listitem').filter({ hasText: baseItemName }).dragTo(page.locator('.tab.items.active'));
  // TODO: this should probably be 0, because the AE should not apply until equipped
  await embeddedActor.checkStat('soak', '1');

  // okay, add the mod
  const weaponMod = new Items(page, modName, "itemmodifier");
  await weaponMod.create();
  await weaponMod.addDirectModifier('Stat', 'Defence-Melee', '1');
  await weaponMod.setRank('1');
  await weaponMod.closeSheet();
  await embeddedActor.editItem(baseItemName);
  await page.getByRole('listitem').filter({ hasText: modName }).dragTo(page.locator('.attachments.items'));
  await weapon.closeSheet();
  await embeddedActor.checkStat('defense.melee', '1');
  await embeddedActor.checkStat('defence.ranged', '0');
  await embeddedActor.checkStat('soak', '1');

  // okay, now add the mod to the attachment
  await embeddedActor.editItem(baseItemName);
  // let the animation play out
  await new Promise(resolve => setTimeout(resolve, 200));
  //await weapon.removeItem(attachmentName);
  await weapon.editItem(attachmentName);
  // let the animation play out
  await new Promise(resolve => setTimeout(resolve, 200));
  const embeddedAttachment = new Items(page, attachmentName, "itemattachment");
  // this is a bit confusing, but 'weaponAttachment' now refers to the embedded instance
  await page.getByText('Modifications', {exact: true}).click();
  // let the animation play out
  await new Promise(resolve => setTimeout(resolve, 200));
  await page.locator('.directory-item').filter({ hasText: modName }).dragTo(page.locator('.content'));
  await embeddedAttachment.enableMod('0');
  await page.getByText('Basics', {exact: true}).click();
  await embeddedAttachment.closeSheet();
  await weapon.closeSheet();
  await embeddedActor.equipItem(baseItemName);
  await embeddedActor.checkStat('defense.melee', '2');
  await embeddedActor.checkStat('defence.ranged', '0');

  // clean up
  await embeddedActor.remove();
  await weapon.remove();
  await weaponAttachment.remove();
  await weaponMod.remove();
});

/**
 * Vehicle Tests
 */
test('critical damage applies correctly', async ({ page }) => {
    // create items
  const critActorName = "qa critActor";
  const critName = "qa critItem"
  const critActor = new Actors(page, critActorName, "vehicle");
  await critActor.create();
  const crit = new Items(page, critName, "criticaldamage");
  await crit.create();

  // set stats on the crit
  await crit.addDirectModifier('Vehicle Stat', 'Armor', '1');
  await crit.closeSheet();

  // drag and drop the crit onto the character
  await page.getByRole('listitem').filter({ hasText: critName }).dragTo(page.locator('.tab.components.active'));
  await critActor.checkStat('armor', '1');

  // clean up
  await critActor.remove();
  await crit.remove();
});

test('ship attachment applies correctly', async ({ page }) => {
  // create items
  const attachmentActorName = "qa attachmentActor";
  const attachmentName = "qa shipAttachment"
  const attachmentActor = new Actors(page, attachmentActorName, "vehicle");
  await attachmentActor.create();
  const attachment = new Items(page, attachmentName, "shipattachment");
  await attachment.create();

  // set stats on the attachment
  await attachment.setStat('encumbrance', '5');
  await attachment.setStat('hardpoints', '3');
  await attachment.closeSheet();

  // drag and drop the attachment onto the character
  await page.getByRole('listitem').filter({ hasText: attachmentName }).dragTo(page.locator('.tab.components.active'));
  await attachmentActor.checkStat('encumbranceCurrent', '5');
  await attachmentActor.switchTab('crew');
  await attachmentActor.checkStat('customizationHardPoints', '-3');

  // clean up
  await attachmentActor.remove();
  await attachment.remove();
});

test('ship weapon applies correctly', async ({ page }) => {
  const actorName = "qa shipWeaponActor";
  const itemName = "qa shipWeaponItem";
  const shipWeaponActor = new Actors(page, actorName, "vehicle");
  await shipWeaponActor.create();
  const shipWeapon = new Items(page, itemName, "shipweapon");
  await shipWeapon.create();

  // add a mod
  await shipWeapon.addDirectModifier('Vehicle Stat', 'Armour', '3');
  await shipWeapon.closeSheet();

  // drag and drop the shipWeapon onto the character
  await page.getByRole('listitem').filter({ hasText: itemName }).dragTo(page.locator('.tab.components.active'));
  await shipWeaponActor.checkStat('armor', '3'); // shipWeapon plus modifier

  // clean up
  await shipWeaponActor.remove();
  await shipWeapon.remove();
});

test('embedded ship weapon applies correctly', async ({ page }) => {
  const actorName = "qa shipAttActor";
  const baseItemName = "qa shipAttWpn";
  const attachmentName = "qa shipAttAtt";
  const vehicle = new Actors(page, actorName, "vehicle");
  await vehicle.create();
  const shipweapon = new Items(page, baseItemName, "shipweapon");
  await shipweapon.create();
  const shipweaponattachment = new Items(page, attachmentName, "itemattachment");
  await shipweaponattachment.create();
  await shipweaponattachment.addDirectModifier('Vehicle Stat', 'Speed', '1');
  await shipweaponattachment.closeSheet();
  // drag the attachment to the shipweapon
  await page.getByRole('listitem').filter({ hasText: attachmentName }).dragTo(page.locator('.attachments.items'));
  await shipweapon.closeSheet();
  await vehicle.checkStat('speed', '0');
  await page.getByRole('listitem').filter({ hasText: baseItemName }).dragTo(page.locator('.tab.components.active'));
  await vehicle.checkStat('speed', '1');

  // clean up
  await vehicle.remove();
  await shipweapon.remove();
  await shipweaponattachment.remove();
});

