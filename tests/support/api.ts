import type { Page } from '@playwright/test';

/**
 * Every call into the Foundry API lives here.
 *
 * Nothing in this file uses the system's own helpers.
 */

/** A Foundry document UUID, e.g. "Actor.abc123" or "Actor.abc123.Item.def456". */
export type Uuid = string;

export interface DocSpec {
  type: string;
  name: string;
  system?: Record<string, unknown>;
  /** Render the sheet as part of creation, which is what the sidebar dialog does */
  renderSheet?: boolean;
  /** Pin the document to a registered sheet at creation, so renderSheet opens that one. */
  sheetClass?: string;
}

/* -------------------------------------------- */
/*  Readiness                                   */
/* -------------------------------------------- */

/**
 * Checks that the world is loaded and prepared to be used
 */
export async function status(page: Page) {
  return page.evaluate(() => ({
    ready: game?.ready === true,
    system: game?.system?.id ?? null,
    systemVersion: game?.system?.version ?? null,
    world: game?.world?.id ?? null,
    isGM: game?.user?.isGM === true,
    // the system hangs its own classes here on init; absent means the system module never executed
    systemLoaded: typeof game?.ffg === 'object' && game.ffg !== null,
  }));
}

/* -------------------------------------------- */
/*  Creation                                    */
/* -------------------------------------------- */

/** Create a world-level Actor. Returns its UUID. */
export async function createActor(page: Page, spec: DocSpec): Promise<Uuid> {
  return page.evaluate(async (s) => {
    // `system` is omitted rather than passed as {} so the payload matches what the create dialog sends
    const data: Record<string, unknown> = { name: s.name, type: s.type };
    if (s.system && Object.keys(s.system).length) data.system = s.system;
    if (s.sheetClass) data.flags = { core: { sheetClass: s.sheetClass } };
    const actor = await Actor.create(data, { renderSheet: s.renderSheet ?? false });
    if (!actor) throw new Error(`Actor.create returned nothing for type "${s.type}"`);
    return actor.uuid;
  }, spec);
}

/** Create a world-level (sidebar) Item. Returns its UUID. */
export async function createItem(page: Page, spec: DocSpec): Promise<Uuid> {
  return page.evaluate(async (s) => {
    const data: Record<string, unknown> = { name: s.name, type: s.type };
    if (s.system && Object.keys(s.system).length) data.system = s.system;
    if (s.sheetClass) data.flags = { core: { sheetClass: s.sheetClass } };
    const item = await Item.create(data, { renderSheet: s.renderSheet ?? false });
    if (!item) throw new Error(`Item.create returned nothing for type "${s.type}"`);
    return item.uuid;
  }, spec);
}

/** Create an Item directly on an Actor - the "created in the sheet" origin. */
export async function createItemOnActor(page: Page, actorUuid: Uuid, spec: DocSpec): Promise<Uuid> {
  return page.evaluate(async ({ actorUuid, s }) => {
    const actor = await fromUuid(actorUuid);
    if (!actor) throw new Error(`No actor at ${actorUuid}`);
    const [item] = await actor.createEmbeddedDocuments('Item', [
      { name: s.name, type: s.type, system: s.system ?? {} },
    ]);
    return item.uuid;
  }, { actorUuid, s: spec });
}

/**
 * Some items never get an AE, so waiting for it would just burn the timeout.
 */
export const TYPES_WITH_INHERENT_EFFECT = [
  'species', 'gear', 'weapon', 'armour', 'shipattachment', 'career', 'specialization',
];

/**
 * Wait for an item's inherent Active Effect to exist.
 *
 * Returns true for types that never get one, so callers can call it unconditionally.
 * Only unparented items get one: `_onCreateAEs` is gated on `!options.parent`.
 */
export async function waitForInherentEffect(page: Page, uuid: Uuid, timeout = 5000): Promise<boolean> {
  return page.evaluate(async ({ uuid, timeout, types }) => {
    const doc = await fromUuid(uuid);
    if (!doc) throw new Error(`No document at ${uuid}`);
    if (!types.includes(doc.type)) return true;
    const deadline = Date.now() + timeout;
    for (;;) {
      if (doc.effects?.find((e: any) => e.name === '(inherent)')) return true;
      if (Date.now() > deadline) return false;
      await new Promise((r) => setTimeout(r, 50));
    }
  }, { uuid, timeout, types: TYPES_WITH_INHERENT_EFFECT });
}

/**
 * Copy an existing Item onto an Actor, as a drag-and-drop would.
 * Uses the document API, so it skips the sheet's `_onDropItemCreate`.
 */
export async function embedItem(page: Page, actorUuid: Uuid, itemUuid: Uuid): Promise<Uuid> {
  return page.evaluate(async ({ actorUuid, itemUuid }) => {
    const actor = await fromUuid(actorUuid);
    const source = await fromUuid(itemUuid);
    if (!actor) throw new Error(`No actor at ${actorUuid}`);
    if (!source) throw new Error(`No item at ${itemUuid}`);
    const [item] = await actor.createEmbeddedDocuments('Item', [source.toObject()]);
    return item.uuid;
  }, { actorUuid, itemUuid });
}

/* -------------------------------------------- */
/*  Compendium origin                           */
/* -------------------------------------------- */

/** Get a world compendium by name, creating it if it doesn't exist. */
export async function ensurePack(page: Page, name: string, documentName: 'Item' | 'Actor' = 'Item'): Promise<string> {
  return page.evaluate(async ({ name, documentName }) => {
    const collection = `world.${name}`;
    let pack = game.packs.get(collection);
    if (!pack) {
      pack = await foundry.documents.collections.CompendiumCollection.createCompendium({
        type: documentName,
        label: name,
        name,
        packageType: 'world',
      });
    }
    return pack.collection;
  }, { name, documentName });
}

/**
 * Find an imported document by its OggDude key.
 * `getCompendiumPack` lowercases the name and strips dots, so "oggdude.Armor" is
 * "world.oggdudearmor".
 */
export async function findImported(page: Page, packName: string, importId: string): Promise<Uuid | null> {
  return page.evaluate(async ({ packName, importId }) => {
    const pack = game.packs.get(`world.${packName.replaceAll('.', '').toLowerCase()}`);
    if (!pack) return null;
    const docs = await pack.getDocuments();
    const found = docs.find((d: any) => d.flags?.starwarsffg?.ffgimportid === importId);
    return found?.uuid ?? null;
  }, { packName, importId });
}

/** Put a document into a compendium pack and return its Compendium UUID. */
export async function createInPack(page: Page, packId: string, spec: DocSpec): Promise<Uuid> {
  return page.evaluate(async ({ packId, s }) => {
    const pack = game.packs.get(packId);
    if (!pack) throw new Error(`No pack ${packId}`);
    const doc = await Item.create(
      { name: s.name, type: s.type, system: s.system ?? {} },
      { pack: packId },
    );
    if (!doc) throw new Error(`Failed to create ${s.type} in ${packId}`);
    return doc.uuid;
  }, { packId, s: spec });
}

/* -------------------------------------------- */
/*  Reading and mutation                        */
/* -------------------------------------------- */

/**
 * Render a document's sheet and return the id of the window element.
 */
export async function openSheet(page: Page, uuid: Uuid): Promise<string> {
  return page.evaluate(async (uuid) => {
    const doc = await fromUuid(uuid);
    if (!doc) throw new Error(`No document at ${uuid}`);
    await doc.sheet.render(true);
    // render(true) resolves before the element is in the DOM for AppV1
    for (let i = 0; i < 200; i++) {
      const el = doc.sheet.element?.[0] ?? doc.sheet.element;
      if (el?.id && document.getElementById(el.id)) return el.id;
      await new Promise((r) => setTimeout(r, 25));
    }
    throw new Error(`Sheet for ${uuid} never appeared in the DOM`);
  }, uuid);
}

/** Close a document's sheet. */
export async function closeSheet(page: Page, uuid: Uuid): Promise<void> {
  await page.evaluate(async (uuid) => {
    const doc = await fromUuid(uuid);
    await doc?.sheet?.close();
  }, uuid);
}

/**
 * Pin a document to a specific registered sheet.
 * Ids are `${scope}.${className}`, e.g. "ffg.ActorSheetFFGV2".
 */
export async function setSheetClass(page: Page, uuid: Uuid, sheetId: string): Promise<void> {
  await page.evaluate(async ({ uuid, sheetId }) => {
    const doc = await fromUuid(uuid);
    if (!doc) throw new Error(`No document at ${uuid}`);
    await doc.setFlag('core', 'sheetClass', sheetId);
  }, { uuid, sheetId });
}

/** Sheet classes registered for a document type, so the matrix can assert it covers them all. */
export async function registeredSheets(page: Page, documentName: 'Actor' | 'Item', type: string): Promise<string[]> {
  return page.evaluate(({ documentName, type }) => {
    const config = CONFIG[documentName].sheetClasses?.[type] ?? {};
    return Object.keys(config);
  }, { documentName, type });
}

/**
 * Build Active Effects from item's modifiers.
 */
export async function rebuildActiveEffects(page: Page, uuid: Uuid): Promise<void> {
  await page.evaluate(async (uuid) => {
    const item = await fromUuid(uuid);
    if (!item) throw new Error(`No item at ${uuid}`);
    const load = (p: string) => import(/* @vite-ignore */ `/systems/starwarsffg/modules/${p}`);
    const ModifierHelpers = (await load('helpers/modifiers.js')).default;
    // The sheet submits every field, not just the modifier rows - applyActiveEffectOnUpdate
    // reaches for `formData.data.hardpoints.value` on ship attachments, for instance.
    await ModifierHelpers.applyActiveEffectOnUpdate(item, {
      data: foundry.utils.deepClone(item.system ?? {}),
    });
  }, uuid);
}

/**
 * Find an item embedded on an actor by name, waiting for it to appear.
 */
export async function findEmbeddedByName(
  page: Page, actorUuid: Uuid, name: string, timeout = 5000,
): Promise<Uuid | null> {
  return page.evaluate(async ({ actorUuid, name, timeout }) => {
    const deadline = Date.now() + timeout;
    for (;;) {
      const actor = await fromUuid(actorUuid);
      const found = actor?.items?.find((i: any) => i.name === name)?.uuid;
      if (found) return found;
      if (Date.now() > deadline) return null;
      await new Promise((r) => setTimeout(r, 50));
    }
  }, { actorUuid, name, timeout });
}

/**
 * Check modifier names against the system's own option lists.
 */
export async function assertModifiersValid(
  page: Page, mods: { modtype: string; mod: string }[],
): Promise<void> {
  const problems = await page.evaluate((mods) => {
    // swffg-config.js exposes the option lists as FFG.allowableModifierChoices
    const map = CONFIG.FFG?.allowableModifierChoices;
    // Fail open. This is a lint, not an assertion
    if (!map || !Object.keys(map).length) return [];
    const out: string[] = [];
    for (const { modtype, mod } of mods) {
      const options = map[modtype];
      if (!options) {
        out.push(`unknown modtype "${modtype}"; known: ${Object.keys(map).sort().join(', ')}`);
        continue;
      }
      const values = Object.values(options).map((o: any) => o.value);
      if (values.includes(mod)) continue;
      // a label was probably used where a value is needed
      const byLabel = Object.values(options).find(
        (o: any) => game.i18n.localize(o.label) === mod,
      ) as any;
      out.push(byLabel
        ? `"${mod}" is the label for "${modtype}"; the value is "${byLabel.value}"`
        : `"${mod}" is not valid for "${modtype}"; valid: ${values.sort().join(', ')}`);
    }
    return out;
  }, mods);

  if (problems.length) {
    throw new Error(`Invalid modifier(s):\n  ${problems.join('\n  ')}`);
  }
}

/**
 * Drop one item onto another, through the sheet's own drop handler.
 */
export async function dropOntoItem(page: Page, parentUuid: Uuid, droppedUuid: Uuid): Promise<void> {
  const problem = await page.evaluate(async ({ parentUuid, droppedUuid }) => {
    const parent = await fromUuid(parentUuid);
    if (!parent) return `No item at ${parentUuid}`;
    const before = (parent.system?.itemattachment?.length ?? 0) + (parent.system?.itemmodifier?.length ?? 0);

    await parent.sheet._onDropItem({
      currentTarget: null,
      dataTransfer: { getData: () => JSON.stringify({ type: 'Item', uuid: droppedUuid }) },
    });

    const after = await fromUuid(parentUuid);
    const now = (after.system?.itemattachment?.length ?? 0) + (after.system?.itemmodifier?.length ?? 0);
    // The handler declines silently - wrong item type for this parent, or not enough hardpoints.
    return now > before ? null : 'the sheet declined the drop (type mismatch or no free hardpoints?)';
  }, { parentUuid, droppedUuid });

  if (problem) throw new Error(`Dropping ${droppedUuid} onto ${parentUuid} failed: ${problem}`);
}

/** A document's full source object, including its Active Effects. */
export async function toObject(page: Page, uuid: Uuid): Promise<Record<string, unknown>> {
  return page.evaluate(async (uuid) => {
    const doc = await fromUuid(uuid);
    if (!doc) throw new Error(`No document at ${uuid}`);
    return doc.toObject();
  }, uuid);
}

/** Read a dotted property off any document. */
export async function read(page: Page, uuid: Uuid, path: string): Promise<unknown> {
  return page.evaluate(async ({ uuid, path }) => {
    const doc = await fromUuid(uuid);
    if (!doc) throw new Error(`No document at ${uuid}`);
    return foundry.utils.getProperty(doc, path) ?? null;
  }, { uuid, path });
}

/**
 * A document flattened to dotted paths, for diffing two of them.
 *
 * Reads transformed values, not source. `toObject()` defaults to source, where the importer's
 * items have `adjusted: 0` on soak, defence, hardpoints and price - it only writes `adjusted`
 * for encumbrance, and the rest fall back to the schema default. Those are recomputed in
 * prepareData anyway, so comparing source reports four differences that don't exist at runtime,
 * while comparing transformed values actually checks that derivation works for both origins.
 *
 * Arrays are compared whole rather than per index, since reordering isn't worth reporting
 * element by element.
 */
export async function flatten(page: Page, uuid: Uuid): Promise<Record<string, unknown>> {
  return page.evaluate(async (uuid) => {
    const doc = await fromUuid(uuid);
    if (!doc) throw new Error(`No document at ${uuid}`);
    const out: Record<string, unknown> = {};
    const walk = (value: any, prefix: string) => {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        out[prefix] = value;
        return;
      }
      for (const [k, v] of Object.entries(value)) walk(v, prefix ? `${prefix}.${k}` : k);
    };
    walk(doc.toObject(false), '');
    return out;
  }, uuid);
}

/** Apply an update to any document. */
export async function update(page: Page, uuid: Uuid, changes: Record<string, unknown>): Promise<void> {
  await page.evaluate(async ({ uuid, changes }) => {
    const doc = await fromUuid(uuid);
    if (!doc) throw new Error(`No document at ${uuid}`);
    await doc.update(changes);
  }, { uuid, changes });
}

/** Toggle an embedded item's equipped flag. */
export async function setEquipped(page: Page, itemUuid: Uuid, equipped: boolean): Promise<void> {
  await update(page, itemUuid, { 'system.equippable.equipped': equipped });

  /*
   * Wait for the effects to follow.
   *
   * `ItemFFG._onUpdate` suspends or restores the item's Active Effects when the equipped flag
   * changes, and it is `async` - but Foundry does not await `_onUpdate`, any more than it awaits
   * `_onCreate`. So `update()` resolves while `effect.update({disabled: …})` is still in flight,
   * and anything reading straight afterwards sees the old state.
   *
   * Only effects the system would actually toggle are waited on: `(inherent)` on an unequipped
   * item is left alone in some cases, so this waits for *any* change rather than insisting every
   * effect matches.
   */
  await page.evaluate(async ({ itemUuid, equipped }) => {
    const deadline = Date.now() + 5000;
    for (;;) {
      const item = await fromUuid(itemUuid);
      const effects = item?.effects?.contents ?? [];
      if (!effects.length || effects.every((e: any) => e.disabled === !equipped)) return;
      if (Date.now() > deadline) return;
      await new Promise((r) => setTimeout(r, 50));
    }
  }, { itemUuid, equipped });
}

/** Delete a document. Ignores one that's already gone. */
export async function deleteDoc(page: Page, uuid: Uuid): Promise<void> {
  await page.evaluate(async (uuid) => {
    const doc = await fromUuid(uuid).catch(() => null);
    if (doc) await doc.delete();
  }, uuid);
}

/** Delete a compendium pack outright. */
export async function deletePack(page: Page, packId: string): Promise<void> {
  await page.evaluate(async (packId) => {
    const pack = game.packs.get(packId);
    if (pack) await pack.deleteCompendium();
  }, packId);
}
