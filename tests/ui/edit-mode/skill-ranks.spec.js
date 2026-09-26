import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';
import * as actorSheet from '../../support/pages/actor-sheet';

/**
 * Skills edited by hand in edit mode keep their values - #2373, where each edit reset every other
 * skill to its default.
 */

test('#2373 editing one skill rank leaves the others alone', async ({ world, page }) => {
  const ctx = await world.build({ actor: 'character' });

  await api.setEditMode(page, ctx.actor, true);
  const sheet = await api.openSheet(page, ctx.actor);

  await actorSheet.setSkillRank(page, sheet, 'Astrogation', 2);
  await expect.poll(
    () => api.read(page, ctx.actor, 'system.skills.Astrogation.rank'),
    { message: 'the first edit landed' }
  ).toBe(2);

  await actorSheet.setSkillRank(page, sheet, 'Athletics', 3);
  await expect.poll(
    () => api.read(page, ctx.actor, 'system.skills.Athletics.rank'),
    { message: 'the second edit landed' }
  ).toBe(3);

  await api.setEditMode(page, ctx.actor, false);

  expect(await api.read(page, ctx.actor, 'system.skills.Astrogation.rank'), 'the first edit survived').toBe(2);
  expect(await api.read(page, ctx.actor, 'system.skills.Athletics.rank'), 'and so did the second').toBe(3);
  expect(await api.read(page, ctx.actor, 'system.skills.Gunnery.rank'), 'an untouched skill kept its rank').toBe(1);
});

test('#2373 a minion keeps its skill ranks after leaving edit mode', async ({ world, page }) => {
  const ctx = await world.build({ actor: 'minion' });

  await api.setEditMode(page, ctx.actor, true);
  const sheet = await api.openSheet(page, ctx.actor);

  await actorSheet.setSkillRank(page, sheet, 'Astrogation', 2);
  await expect.poll(
    () => api.read(page, ctx.actor, 'system.skills.Astrogation.rank'),
    { message: 'the first edit landed' }
  ).toBe(2);

  await actorSheet.setSkillRank(page, sheet, 'Athletics', 3);
  await expect.poll(
    () => api.read(page, ctx.actor, 'system.skills.Athletics.rank'),
    { message: 'the second edit landed' }
  ).toBe(3);

  await api.setEditMode(page, ctx.actor, false);

  expect(await api.read(page, ctx.actor, 'system.skills.Astrogation.rank'), 'the first edit survived').toBe(2);
  expect(await api.read(page, ctx.actor, 'system.skills.Athletics.rank'), 'and so did the second').toBe(3);
});

test('#2373 ticking one minion group skill leaves the others ticked', async ({ world, page }) => {
  const ctx = await world.build({ actor: 'minion' });

  await api.setEditMode(page, ctx.actor, true);
  const sheet = await api.openSheet(page, ctx.actor);

  await actorSheet.setGroupSkill(page, sheet, 'Astrogation', true);
  await expect.poll(
    () => api.read(page, ctx.actor, 'system.skills.Astrogation.groupskill'),
    { message: 'the first box stuck' }
  ).toBe(true);

  await actorSheet.setGroupSkill(page, sheet, 'Athletics', true);
  await expect.poll(
    () => api.read(page, ctx.actor, 'system.skills.Athletics.groupskill'),
    { message: 'the second box stuck' }
  ).toBe(true);

  await api.setEditMode(page, ctx.actor, false);

  const first = await api.read(page, ctx.actor, 'system.skills.Astrogation.groupskill');
  const second = await api.read(page, ctx.actor, 'system.skills.Athletics.groupskill');

  expect(first, 'the first is still ticked').toBe(true);
  expect(second, 'and so is the second').toBe(true);
});

test('#2373 submitting the sheet with nothing changed keeps every skill rank', async ({ world, page }) => {
  const ctx = await world.build({ actor: 'character' });

  await api.update(page, ctx.actor, { 'system.skills.Astrogation.rank': 2 });
  await api.submitSheet(page, ctx.actor);

  expect(await api.read(page, ctx.actor, 'system.skills.Astrogation.rank'), 'the edited rank held').toBe(2);
  expect(await api.read(page, ctx.actor, 'system.skills.Gunnery.rank'), 'and so did the fixture\'s').toBe(1);
});
