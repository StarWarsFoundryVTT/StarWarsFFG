import { test, expect } from '../support/fixtures';
import * as api from '../support/api';

/**
 * The harness's shortcuts must land an item in the state a real drop would.
 */

const PROBE = { name: 'qa fidelity probe', key: 'Soak', value: 1, active: true };

const CARRIERS = [
  { item: 'armour', nested: true },
  { item: 'weapon', nested: true },
  { item: 'gear', nested: false },
];

for (const { item, nested } of CARRIERS) {
  test(`${item} placed by the harness matches one placed by the sheet's drop handler`, async ({ page, world }) => {
    // Something nested inside it where the type allows, since the nesting is what carries effects
    const ctx = await world.build({
      actor: 'character',
      item,
      equipped: false,
      ...(nested
        ? { attachment: { name: 'insert', modifications: [PROBE] } }
        : { modifier: PROBE }),
    });

    const dropped = await api.dropOnActorSheet(page, ctx.actor, ctx.source);

    expect(await api.comparable(page, dropped), 'the shortcut and the drop handler agree')
      .toEqual(await api.comparable(page, ctx.item));
  });
}
