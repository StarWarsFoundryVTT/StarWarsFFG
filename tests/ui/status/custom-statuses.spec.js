import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';

/**
 * Statuses a GM adds through the `additionalStatuses` setting.
 */

test('a status added through the setting is offered alongside the built-in ones', async ({ world, page }) => {
  await world.setSetting('additionalStatuses', JSON.stringify([
    {
      id: 'qa-winded',
      name: 'QA Winded',
      img: 'icons/svg/downgrade.svg',
      changes: [],
    },
  ]));

  const ids = (await api.readStatusEffects(page)).map((status) => status.id);

  expect(ids, 'the GM\'s own status is offered').toContain('qa-winded');
  expect(ids, 'next to the ones the system built').toContain('starwarsffg-defeated');
});

test('a status added through the setting applies its changes', async ({ world, page, consumers }) => {
  // mode 2 is ADD, as the GM has to write it - the setting takes raw JSON, not a form
  await world.setSetting('additionalStatuses', JSON.stringify([
    {
      id: 'qa-braced',
      name: 'QA Braced',
      img: 'icons/svg/upgrade.svg',
      changes: [
        { key: 'system.stats.soak.value', mode: 2, value: '2' },
      ],
    },
  ]));

  const ctx = await world.build({
    actor: 'character',
  });

  expect(await consumers.stat(ctx, 'Soak'), 'its own soak to begin with').toBe(3);

  await api.toggleStatus(page, ctx.actor, 'qa-braced', true);

  expect(await consumers.stat(ctx, 'Soak'), 'and two more while braced').toBe(3 + 2);
});

test.fixme('bad JSON in the setting leaves the built-in statuses alone', async ({ world, page, consoleGuard }) => {
  consoleGuard.allow(/failed to render/);

  await world.setSetting('additionalStatuses', '[{ "id": "qa-broken", ');

  const ids = (await api.readStatusEffects(page)).map((status) => status.id);
  const thrown = consoleGuard.errors.join(' | ') || 'nothing';

  // FIXME: #2309
  expect(thrown, 'the bad JSON is reported rather than thrown').toBe('nothing');
  expect(ids, 'the system\'s own are still offered').toContain('starwarsffg-defeated');
  expect(ids.filter((id) => !id.startsWith('starwarsffg-')), 'and nothing half-read got in').toEqual([]);
});

test('a custom status taking a built-in id does not replace it', async ({ world, page, consumers }) => {
  await world.setSetting('additionalStatuses', JSON.stringify([
    {
      id: 'starwarsffg-defeated',
      name: 'QA Impostor',
      img: 'icons/svg/skull.svg',
      changes: [
        { key: 'system.stats.soak.value', mode: 2, value: '5' },
      ],
    },
  ]));

  const ctx = await world.build({
    actor: 'character',
  });
  const claiming = (await api.readStatusEffects(page))
    .filter((status) => status.id === 'starwarsffg-defeated');

  await api.toggleStatus(page, ctx.actor, 'starwarsffg-defeated', true);

  const effects = (await api.readEffects(page, ctx.actor)).map((effect) => effect.name);

  expect(claiming, 'the world offers two statuses under the one id').toHaveLength(2);
  expect(effects, 'the impostor is not what landed').not.toContain('QA Impostor');
  expect(await consumers.stat(ctx, 'Soak'), 'and its changes went nowhere').toBe(3);
});
