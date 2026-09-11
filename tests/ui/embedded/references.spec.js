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

test.fixme('a species talent applies without being re-added', async ({ world, page, consumers }) => {
  const species = await world.item({ item: 'species' });
  const talent = await world.item({
    item: 'talent',
    attributes: [{ modtype: 'Stat', mod: 'Strain', value: 2 }],
  });
  await api.dropOnReferenceSheet(page, species, talent);

  const ctx = await world.place(species, { actor: 'character' });

  // FIXME: currently fails - talent gets added twice (see #2295)
  expect(await consumers.stat(ctx, 'Strain'), 'applied on the first go').toBe(13 + 2);
});

test.fixme('removing a species removes the talents it granted', async ({ world, page, consumers }) => {
  const species = await world.item({ item: 'species' });
  const talent = await world.item({
    item: 'talent',
    attributes: [{ modtype: 'Stat', mod: 'Wounds', value: 1 }],
  });
  await api.dropOnReferenceSheet(page, species, talent);

  const ctx = await world.place(species, { actor: 'character' });

  // TEMPORARY: where the extra wounds come from. Delete once settled.
  console.log(JSON.stringify(await page.evaluate(async ({ actorUuid, speciesUuid }) => {
    const actor = await fromUuid(actorUuid);
    const owned = await fromUuid(speciesUuid);
    return {
      woundsMax: actor.system.stats.wounds.max,
      itemsOnActor: actor.items.map((i) => `${i.type}:${i.name}`),
      speciesEffects: (owned?.effects?.contents ?? []).map(
        (e) => `${e.name} ${e.disabled ? '(off)' : ''} ${e.changes.map((c) => `${c.key}=${c.value}`).join(',')}`),
      worldItems: game.items.contents.length,
      worldActors: game.actors.contents.length,
    };
  }, { actorUuid: ctx.actor, speciesUuid: ctx.item }), null, 2));

  expect(await consumers.stat(ctx, 'Wounds'), 'granted while the species is there').toBe(12 + 1);

  await api.deleteDoc(page, ctx.item);

  // FIXME: currently fails - talent gets added twice (see #2295)
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
