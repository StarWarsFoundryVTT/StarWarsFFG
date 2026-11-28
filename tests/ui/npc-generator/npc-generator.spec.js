import { test, expect } from '../../support/fixtures';

/**
 * The NPC generator window
 */

const APP = '#swffg-npc-generator';

/** The open generator's draft */
const draftOf = (page) => page.evaluate(() => {
  const app = foundry.applications.instances.get('swffg-npc-generator');
  return JSON.parse(JSON.stringify(app._draft));
});

/**
 * Opens the generator and waits for its render, so a render that throws fails here with its own error
 * rather than as a missing window. Only the sidebar test goes through the actual button
 */
async function openGenerator(page) {
  const opened = await page.evaluate(async () => {
    const app = await game.ffg.npcGenerator.open();
    return { rendered: app.rendered, state: app.state };
  });
  expect(opened, 'the generator renders').toEqual({ rendered: true, state: 2 });
  const app = page.locator(APP);
  await expect(app.locator('.npc-generator-title h2'), 'the preview names the NPC').not.toBeEmpty();
  return app;
}

test.afterEach(async ({ page }) => {
  await page.evaluate(async () => foundry.applications.instances.get('swffg-npc-generator')?.close());
});

test('the Actors sidebar opens the generator on a previewed NPC', async ({ page }) => {
  await page.evaluate(() => {
    ui.sidebar.expand();
    ui.sidebar.changeTab('actors', 'primary');
  });
  await page.locator('#ffgNpcGenerator').click();
  const app = page.locator(APP);
  await expect(app.locator('.npc-generator-title h2'), 'the preview names the NPC').not.toBeEmpty();
  await expect(
    app.locator('.npc-generator-characteristics li'),
    'all six characteristics are shown',
  ).toHaveCount(6);
  await expect(app.locator('select[name="archetype"]'), 'a soldier to start with').toHaveValue('soldier');
  await expect(app.locator('.npc-generator-title span'), 'a rival to start with').toHaveText('Rival');
  await expect(
    app.locator('.npc-generator-options .form-group').first().locator('select'),
    'the type is the first choice',
  ).toHaveAttribute('name', 'type');
  await expect(app.locator('[data-section="career"]'), 'a rival has no career').toHaveCount(0);
  const sections = await app.locator('.npc-generator-section').evaluateAll(
    (all) => all.map((section) => section.dataset.section),
  );
  expect(sections, 'stats come straight after characteristics').toEqual(
    ['species', 'characteristics', 'stats', 'skills', 'talents', 'gear'],
  );
});

test('an excluded weapon tag keeps every weapon with it off the NPC', async ({ page }) => {
  const app = await openGenerator(page);
  const tag = await page.evaluate(() => {
    const app = foundry.applications.instances.get('swffg-npc-generator');
    const primary = app._draft.items.find((item) => item.slot === 'primary');
    return app._content.items.find((entry) => entry.uuid === primary.uuid).tags[0];
  });
  expect(tag, 'the primary weapon has a tag to exclude').toBeTruthy();

  await app.locator('[data-limits="gear"]').click();
  await app.locator('multi-select[name="filters.weapon.exclude"] select').selectOption(tag);
  await expect.poll(async () => {
    const tagged = await page.evaluate((tag) => {
      const app = foundry.applications.instances.get('swffg-npc-generator');
      const tags = (uuid) => app._content.items.find((entry) => entry.uuid === uuid).tags;
      return app._draft.items.filter((item) => item.type === 'weapon' && tags(item.uuid).includes(tag)).length;
    }, tag);
    return tagged;
  }, `nothing tagged ${tag} is carried`).toBe(0);
});

test('each skill shows the dice it rolls', async ({ page }) => {
  await openGenerator(page);
  const skills = await page.evaluate(() => {
    const app = foundry.applications.instances.get('swffg-npc-generator');
    const theme = game.settings.get('starwarsffg', 'skilltheme');
    const list = CONFIG.FFG.alternateskilllists.find((l) => l.id === theme).skills;
    return Object.entries(app._draft.skills).map(([key, skill]) => {
      const value = app._draft.characteristics[list[key].characteristic];
      const row = app.element.querySelector(`[data-skill="${CSS.escape(key)}"] .npc-generator-pool`);
      const count = (icon) => [...row.querySelectorAll('img')].filter((img) => img.src.endsWith(icon)).length;
      return {
        skill: key,
        shown: { proficiency: count(CONFIG.FFG.PROFICIENCY_ICON), ability: count(CONFIG.FFG.ABILITY_ICON) },
        wanted: {
          proficiency: Math.min(value, skill.rank),
          ability: Math.max(value, skill.rank) - Math.min(value, skill.rank),
        },
      };
    });
  });

  expect(skills.length, 'a rival has trained skills to show').toBeGreaterThan(0);
  for (const { skill, shown, wanted } of skills) {
    expect(shown, `${skill}: the higher of the two as dice, the lower upgraded`).toEqual(wanted);
  }
});

test('modifiers are numbered and applied in the order they were ticked', async ({ page }) => {
  const app = await openGenerator(page);
  await app.locator('label.checkbox', { hasText: 'Veteran' }).locator('input').check();
  await expect(app.locator('label.checkbox', { hasText: 'Veteran' }), 'the first one ticked').toContainText('1');
  await app.locator('label.checkbox', { hasText: 'Low-tech' }).locator('input').check();
  await expect(app.locator('label.checkbox', { hasText: 'Low-tech' }), 'then the second').toContainText('2');
  expect((await draftOf(page)).options.modifiers, 'the draft applies them in that order').toEqual(
    ['veteran', 'lowTech'],
  );
});

test('Create NPC makes the previewed NPC in the chosen folder', async ({ page, world }) => {
  const folderUuid = world.track(await page.evaluate(async () => {
    const folder = await Folder.implementation.create({ name: 'qa generated npcs', type: 'Actor' });
    return folder.uuid;
  }));
  const app = await openGenerator(page);
  await app.locator('input[name="name"]').fill('qa generated rival');
  await app.locator('input[name="name"]').press('Tab');
  await app.locator('select[name="folder"]').selectOption({ label: 'qa generated npcs' });
  await expect(app.locator('.npc-generator-title h2'), 'the name is taken up by the preview').toHaveText(
    'qa generated rival',
  );
  const draft = await draftOf(page);

  await app.locator('[data-action="create"]').click();
  const created = () => page.evaluate(() => !!game.actors.getName('qa generated rival'));
  await expect.poll(created, 'the NPC is created').toBe(true);
  const made = await page.evaluate(async () => {
    const actor = game.actors.getName('qa generated rival');
    await actor.sheet.close();
    return {
      uuid: actor.uuid,
      type: actor.type,
      folder: actor.folder?.uuid,
      species: actor.items.find((i) => i.type === 'species')?.name ?? null,
      talents: actor.items.filter((i) => i.type === 'talent').map((i) => i.name).sort(),
    };
  });
  world.track(made.uuid);

  expect(made.type, 'of the previewed type').toBe('rival');
  expect(made.folder, 'in the chosen folder').toBe(folderUuid);
  expect(made.species, 'with the previewed species').toBe(draft.species?.name ?? null);
  expect(made.talents, 'and the previewed talents').toEqual(draft.talents.map((t) => t.name).sort());
});

