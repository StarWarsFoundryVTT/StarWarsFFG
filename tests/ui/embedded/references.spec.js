import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';

/**
 * Links between documents, rather than containment.
 */

test('a species records a link to a talent dropped on it', async ({ world, page }) => {
  const species = await world.item({ item: 'species' });
  const talent = await world.item({
    item: 'talent',
    attributes: [{ modtype: 'Stat', mod: 'Wounds', value: 1 }],
  });

  await api.dropOnReferenceSheet(page, species, talent);

  const talents = await api.read(page, species, 'system.talents');
  const linked = Object.values(talents ?? {})[0];
  expect(linked?.source, 'the link points at the talent document').toBe(talent);
});

test('a species grants its linked talents to the character', async ({ world, page, consumers }) => {
  // The contract a player expects. If this fails while the link above is recorded, it is #1957 -
  // species talents that sit there until they are removed and re-added.
  const species = await world.item({ item: 'species' });
  const talent = await world.item({
    item: 'talent',
    attributes: [{ modtype: 'Stat', mod: 'Wounds', value: 1 }],
  });
  await api.dropOnReferenceSheet(page, species, talent);

  const ctx = await world.place(species, { actor: 'character' });

  await api.settledOwnedItems(page, ctx.actor);

  expect(await consumers.stat(ctx, 'Wounds'), 'the linked talent applies').toBe(12 + 1);
});

test('a species records a linked ability without a source', async ({ world, page }) => {
  // Abilities are stored differently from talents: name and description are copied, and no `source`
  // is kept (items/item-sheet-ffg.js:2072). So an ability is neither a link nor a full copy, and
  // nothing connects it back to the document it came from.
  const species = await world.item({ item: 'species' });
  const ability = await world.item({ item: 'ability' });

  await api.dropOnReferenceSheet(page, species, ability);

  const abilities = await api.read(page, species, 'system.abilities');
  const linked = Object.values(abilities ?? {})[0];
  expect(linked, 'the ability was recorded').toBeTruthy();
  expect(linked?.source, 'but with no way back to the document').toBeUndefined();
});

/** Set an ability's Wounds modifier from its sheet's Modifiers tab, adding the row first if needed. */
async function setWoundsOnSheet(page, ability, value) {
  await api.openSheet(page, ability);
  const problem = await page.evaluate(async ({ uuid, value }) => {
    const wait = async (check, what) => {
      const deadline = Date.now() + 5000;
      while (!(await check())) {
        if (Date.now() > deadline) throw new Error(what);
        await new Promise((r) => setTimeout(r, 50));
      }
    };
    const item = await fromUuid(uuid);
    const root = () => item.sheet.element?.[0] ?? item.sheet.element;
    try {
      if (!root().querySelector('.tab.attributes .modvalue')) {
        const create = root().querySelector('.tab.attributes .attribute-control[data-action="create"]');
        if (!create) return 'the ability sheet has no Modifiers tab to add a row from';
        create.click();
        await wait(() => root().querySelector('.tab.attributes .modvalue'), 'no modifier row appeared');
      }
      const input = root().querySelector('.tab.attributes .modvalue');
      input.value = String(value);
      input.dispatchEvent(new Event('change', { bubbles: true }));
      const applied = () => item.effects.some((e) => e.changes.some((c) => Number(c.value) === value));
      await wait(applied, `no effect carrying ${value} was built from the sheet`);
    } catch (err) {
      return err.message;
    }
    return null;
  }, { uuid: ability, value });
  await api.closeSheet(page, ability);
  if (problem) throw new Error(problem);
}

/** Drop an ability on a species' rendered sheet, as a user drags it. */
async function dropAbility(page, species, ability) {
  await api.openSheet(page, species);
  await api.dropOnSheetElement(page, species, ability);
  await api.closeSheet(page, species);
}

test('#1539 a modifier set on an ability sheet reaches the character through its species',
  async ({ world, page, consumers }) => {
    const species = await world.item({ item: 'species' });
    const ability = await world.item({ item: 'ability' });
    await setWoundsOnSheet(page, ability, 1);
    await dropAbility(page, species, ability);

    const ctx = await world.place(species, { actor: 'character' });
    await api.settledOwnedItems(page, ctx.actor);

    expect(await consumers.stat(ctx, 'Wounds'), 'the ability applies through the species').toBe(12 + 1);
  });

test('#1539 removing an ability from a species removes its modifier', async ({ world, page, consumers }) => {
  const species = await world.item({ item: 'species' });
  const ability = await world.item({ item: 'ability' });
  await setWoundsOnSheet(page, ability, 1);
  await dropAbility(page, species, ability);

  await api.openSheet(page, species);
  const problem = await page.evaluate(async (uuid) => {
    const item = await fromUuid(uuid);
    const root = item.sheet.element?.[0] ?? item.sheet.element;
    const control = root?.querySelector('.item-delete[data-item-type="ability"]');
    if (!control) return 'the species sheet rendered no ability delete control';
    control.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
    const deadline = Date.now() + 5000;
    while (Object.keys((await fromUuid(uuid)).system.abilities).length) {
      if (Date.now() > deadline) return 'the ability was never removed';
      await new Promise((r) => setTimeout(r, 50));
    }
    return null;
  }, species);
  await api.closeSheet(page, species);
  expect(problem, 'the ability was removed through the sheet').toBeNull();

  const ctx = await world.place(species, { actor: 'character' });
  await api.settledOwnedItems(page, ctx.actor);

  expect(await consumers.stat(ctx, 'Wounds'), 'the removed ability no longer applies').toBe(12);
});

test('#1539 dropping an edited ability on a species replaces the old one', async ({ world, page, consumers }) => {
  const species = await world.item({ item: 'species' });
  const ability = await world.item({ item: 'ability' });
  await setWoundsOnSheet(page, ability, 1);
  await dropAbility(page, species, ability);

  await setWoundsOnSheet(page, ability, 2);
  await dropAbility(page, species, ability);

  const ctx = await world.place(species, { actor: 'character' });
  await api.settledOwnedItems(page, ctx.actor);

  expect(await consumers.stat(ctx, 'Wounds'), 'only the edited modifier applies').toBe(12 + 2);
});

test('a species talent applies without being re-added', async ({ world, page, consumers }) => {
  const species = await world.item({ item: 'species' });
  const talent = await world.item({
    item: 'talent',
    attributes: [{ modtype: 'Stat', mod: 'Strain', value: 2 }],
  });
  await api.dropOnReferenceSheet(page, species, talent);

  const ctx = await world.place(species, { actor: 'character' });

  // the talent is granted by a hook after the species lands, so wait for the actor to stop growing
  await api.settledOwnedItems(page, ctx.actor);

  expect(await consumers.stat(ctx, 'Strain'), 'applied on the first go').toBe(13 + 2);
});

test('removing a species removes the talents it granted', async ({ world, page, consumers }) => {
  const species = await world.item({ item: 'species' });
  const talent = await world.item({
    item: 'talent',
    attributes: [{ modtype: 'Stat', mod: 'Wounds', value: 1 }],
  });
  await api.dropOnReferenceSheet(page, species, talent);

  const ctx = await world.place(species, { actor: 'character' });

  await api.settledOwnedItems(page, ctx.actor);

  expect(await consumers.stat(ctx, 'Wounds'), 'granted while the species is there').toBe(12 + 1);

  await api.deleteDoc(page, ctx.item);

  // polled to avoid catching mid-update
  await expect.poll(() => consumers.stat(ctx, 'Wounds'), {
    message: 'back to the actor’s own threshold',
  }).toBe(12);
});

test('a career records a link to its specializations', async ({ world, page }) => {
  const career = await world.item({ item: 'career' });
  const specialization = await world.item({ item: 'specialization' });

  await api.dropOnReferenceSheet(page, career, specialization);

  const specializations = await api.read(page, career, 'system.specializations');
  const linked = Object.values(specializations ?? {})[0];
  expect(linked?.source, 'the link points at the specialization document').toBe(specialization);
});

test('a career marks its career skills on the actor', async ({ world, page, consumers }) => {
  const career = await world.item({
    item: 'career',
    itemOverrides: { careerSkills: { careerSkill0: 'Cool' } },
  });
  await api.submitSheet(page, career);

  const ctx = await world.place(career, { actor: 'character' });

  expect(await api.read(page, ctx.actor, 'system.skills.Cool.careerskill'),
    'Cool is a career skill').toBe(true);
});

test('a link to a deleted document is reported as broken rather than throwing', async ({ world, page }) => {
  // test if anything throws.
  const species = await world.item({ item: 'species' });
  const talent = await world.item({
    item: 'talent',
    attributes: [{ modtype: 'Stat', mod: 'Wounds', value: 1 }],
  });
  await api.dropOnReferenceSheet(page, species, talent);
  await api.deleteDoc(page, talent);

  const ctx = await world.place(species, { actor: 'character' });

  const talents = await api.read(page, ctx.item, 'system.talents');
  const orphan = Object.values(talents ?? {})[0];
  expect(orphan?.source, 'the dangling link is still recorded').toBe(talent);
});
