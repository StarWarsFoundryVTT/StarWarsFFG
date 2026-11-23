import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';

/**
 * A ship attachment takes Modifications the way an item attachment does (#1875): mods are dropped onto its
 * sheet, installed from its Modifications editor, and only an installed one reaches the vehicle.
 */

/** Drop a mod on the ship attachment's sheet */
async function dropOnSheet(page, attachmentUuid, modUuid) {
  await api.openSheet(page, attachmentUuid);
  const problem = await page.evaluate(async ({ attachmentUuid, modUuid }) => {
    const attachment = await fromUuid(attachmentUuid);
    const root = attachment.sheet.element?.[0] ?? attachment.sheet.element;
    const target = root.querySelector('.tab.attributes');
    if (!target) return 'the ship attachment sheet has no .tab.attributes';
    const before = attachment.system.itemmodifier.length;

    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', JSON.stringify({ type: 'Item', uuid: modUuid }));
    target.dispatchEvent(new DragEvent('drop', { dataTransfer, bubbles: true, cancelable: true }));

    const deadline = Date.now() + 5000;
    while (attachment.system.itemmodifier.length === before) {
      if (Date.now() > deadline) return 'the drop never added a mod';
      await new Promise((r) => setTimeout(r, 25));
    }
    // the effects are created after the mod is written
    await new Promise((r) => setTimeout(r, 250));
    return null;
  }, { attachmentUuid, modUuid });
  if (problem) throw new Error(problem);
}

/** The qualities the ship attachment's own sheet lists */
async function listedQualities(page, attachmentUuid) {
  return page.evaluate(async (uuid) => {
    const item = await fromUuid(uuid);
    await item.sheet._render(true);
    const root = item.sheet.element?.[0] ?? item.sheet.element;
    const rows = root.querySelectorAll('li[data-item-type="itemmodifier"] .item-name');
    return [...rows].map((e) => e.textContent.trim());
  }, attachmentUuid);
}

async function shipWithMod(world, page) {
  const ctx = await world.build({
    actor: 'vehicle',
    item: 'shipattachment',
  });
  const mod = await world.modifier({
    name: 'qa true aim',
    key: 'Handling',
    modtype: 'Vehicle Stat',
    value: 1,
  });
  // a mod made by hand in the sidebar carries live effects, though it is not installed anywhere
  await api.setEffectsDisabled(page, mod, false);
  await dropOnSheet(page, ctx.item, mod);
  return ctx;
}

test('#1875 a mod dropped on a ship attachment waits to be installed', async ({ world, page, consumers }) => {
  const ctx = await shipWithMod(world, page);

  const modifications = await api.read(page, ctx.item, 'system.itemmodifier');
  expect(modifications.map((m) => m.name), 'the mod is on the attachment').toEqual(['qa true aim']);
  expect(await listedQualities(page, ctx.item), 'it is not listed as a quality yet').toEqual([]);
  expect(await consumers.stat(ctx, 'Handling'), 'handling is unchanged until it is installed').toBe(1);
});

test('#1875 a Modification installed on a ship attachment reaches the vehicle', async ({ world, page, consumers }) => {
  const ctx = await shipWithMod(world, page);

  await api.openModificationsEditor(page, ctx.item);
  await api.setStandaloneModificationSlots(page, ctx.item, 0, ['modified']);
  await api.closeModificationsEditor(page, ctx.item);

  expect(await api.read(page, ctx.item, 'system.itemmodifier.0.system.active'), 'it went in').toBe(true);
  expect(await consumers.stat(ctx, 'Handling'), 'base handling and the installed +1').toBe(1 + 1);
  expect(await listedQualities(page, ctx.item), 'and it is listed as a quality').toEqual(['qa true aim']);
});

test('#1875 a failed Modification on a ship attachment does nothing', async ({ world, page, consumers }) => {
  const ctx = await shipWithMod(world, page);

  await api.openModificationsEditor(page, ctx.item);
  await api.setStandaloneModificationSlots(page, ctx.item, 0, ['failed']);
  await api.closeModificationsEditor(page, ctx.item);

  expect(await consumers.stat(ctx, 'Handling'), 'base handling only').toBe(1);
});
