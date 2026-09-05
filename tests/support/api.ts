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
    const actor = await Actor.create({ name: s.name, type: s.type, system: s.system ?? {} });
    if (!actor) throw new Error(`Actor.create returned nothing for type "${s.type}"`);
    return actor.uuid;
  }, spec);
}

/** Create a world-level (sidebar) Item. Returns its UUID. */
export async function createItem(page: Page, spec: DocSpec): Promise<Uuid> {
  return page.evaluate(async (s) => {
    const item = await Item.create({ name: s.name, type: s.type, system: s.system ?? {} });
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
/*  Nested (synthetic) containment              */
/* -------------------------------------------- */

/**
 * Append an entry to one of the system's nested arrays.
 * Rewrites the whole array, which is what the system itself does.
 */
export async function pushNested(
  page: Page,
  ownerUuid: Uuid,
  path: 'system.itemattachment' | 'system.itemmodifier',
  entry: Record<string, unknown>,
): Promise<void> {
  await page.evaluate(async ({ ownerUuid, path, entry }) => {
    const owner = await fromUuid(ownerUuid);
    if (!owner) throw new Error(`No document at ${ownerUuid}`);
    const current = foundry.utils.getProperty(owner, path) ?? [];
    await owner.update({ [path]: [...current, entry] });
  }, { ownerUuid, path, entry });
}

/**
 * Append a modifier inside an attachment (D3).
 * Addressed by array index because these entries have no id.
 */
export async function pushNestedDeep(
  page: Page,
  ownerUuid: Uuid,
  outerPath: 'system.itemattachment',
  outerIndex: number,
  innerPath: 'system.itemmodifier',
  entry: Record<string, unknown>,
): Promise<void> {
  await page.evaluate(async ({ ownerUuid, outerPath, outerIndex, innerPath, entry }) => {
    const owner = await fromUuid(ownerUuid);
    if (!owner) throw new Error(`No document at ${ownerUuid}`);
    const outer = foundry.utils.deepClone(foundry.utils.getProperty(owner, outerPath) ?? []);
    const target = outer[outerIndex];
    if (!target) throw new Error(`No entry at ${outerPath}[${outerIndex}] of ${ownerUuid}`);
    const inner = foundry.utils.getProperty(target, innerPath) ?? [];
    foundry.utils.setProperty(target, innerPath, [...inner, entry]);
    await owner.update({ [outerPath]: outer });
  }, { ownerUuid, outerPath, outerIndex, innerPath, entry });
}

/* -------------------------------------------- */
/*  Reading and mutation                        */
/* -------------------------------------------- */

/** Read a dotted property off any document. */
export async function read(page: Page, uuid: Uuid, path: string): Promise<unknown> {
  return page.evaluate(async ({ uuid, path }) => {
    const doc = await fromUuid(uuid);
    if (!doc) throw new Error(`No document at ${uuid}`);
    return foundry.utils.getProperty(doc, path) ?? null;
  }, { uuid, path });
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
