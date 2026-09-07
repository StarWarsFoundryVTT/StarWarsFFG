import { test, expect } from '../../../support/fixtures';
import * as api from '../../../support/api';
import { skillDicePool } from '../../../support/pages/actor-sheet';

/**
 * Modifiers on talents inside a specialization, and on upgrades inside a force power or
 * signature ability - the system's second nesting family.
 */

const CASES = [
  { item: 'specialization',   modtype: 'Skill Boost',       skill: 'Perception', kind: 'Boost',   value: 3 },
  { item: 'forcepower',       modtype: 'Skill Add Success', skill: 'Computers',  kind: 'Success', value: 2 },
  { item: 'signatureability', modtype: 'Skill Add Success', skill: 'Medicine',   kind: 'Success', value: 1 },
];

for (const c of CASES) {
  test(`a learned ${c.item} node grants ${c.kind} ${c.value} on ${c.skill}`, async ({ page, world }) => {
    const ctx = await world.build({
      actor: 'character',
      item: c.item,
      talents: [
        // an unlearned node first, to prove it is skipped rather than merely absent
        { name: 'qa unlearned', islearned: false,
          attributes: [{ modtype: 'Skill Add Despair', mod: 'Cool', value: 3 }] },
        { name: 'qa learned',
          attributes: [{ modtype: c.modtype, mod: c.skill, value: c.value }] },
      ],
    });

    await api.openSheet(page, ctx.actor);

    expect(await skillDicePool(page, ctx.actorName, c.skill), 'from the learned node')
      .toContain(`${c.value} ${c.kind}`);
    expect(await skillDicePool(page, ctx.actorName, 'Cool'), 'unlearned node contributes nothing')
      .not.toContain('Despair');

    await api.closeSheet(page, ctx.actor);
  });
}
