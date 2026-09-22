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
  /** Flags to create the document with, for the state the system keeps outside `system`. */
  flags?: Record<string, unknown>;
}

/* -------------------------------------------- */
/*  Readiness                                   */
/* -------------------------------------------- */

/**
 * Checks that the world is loaded and prepared to be used
 */
export async function status(page: Page) {
  return page.evaluate(() => ({
    ready: (globalThis as any).game?.ready === true,
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
    if (s.flags) data.flags = s.flags;
    if (s.sheetClass) data.flags = { ...(data.flags ?? {}), core: { sheetClass: s.sheetClass } };
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
    const data = source.toObject();

    /*
     * What the actor sheet's drop handler does on the way in.
     *
     * `ActorSheetFFG._onDropItem` suspends every non-inherent effect on armour and weapons before
     * creating them (actors/actor-sheet-ffg.js:159), because a carried item contributes nothing
     * until it is equipped - equipping is what restores them. Creating the item without that step
     * leaves an attachment's modifiers live on an unequipped item, which no drag can produce.
     *
     * Only this one transformation is mirrored, not the whole handler: dropping a talent or a
     * specialization there opens a purchase dialog, which a test cannot answer.
     */
    if (['armour', 'weapon'].includes(data.type)) {
      for (const effect of data.effects ?? []) {
        if (effect.name !== '(inherent)') effect.disabled = true;
      }
    }

    const [item] = await actor.createEmbeddedDocuments('Item', [data]);
    return item.uuid;
  }, { actorUuid, itemUuid });
}

/* -------------------------------------------- */
/*  Compendium origin                           */
/* -------------------------------------------- */

/** Get a world compendium by name, creating it if it doesn't exist. */
export async function ensurePack(
  page: Page, name: string, documentName: 'Item' | 'Actor' = 'Item',
): Promise<{ pack: string; created: boolean }> {
  return page.evaluate(async ({ name, documentName }) => {
    const collection = `world.${name}`;
    let pack = game.packs.get(collection);
    if (pack) return { pack: pack.collection, created: false };

    pack = await foundry.documents.collections.CompendiumCollection.createCompendium({
      type: documentName,
      label: name,
      name,
      packageType: 'world',
    });
    return { pack: pack.collection, created: true };
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

/**
 * What a seeded pack holds, by the id the import gave each document.
 */
export async function readPack(page: Page, packName: string): Promise<{
  id: string; name: string; importId: string;
}[]> {
  return page.evaluate(async (packName) => {
    const pack = game.packs.get(`world.${packName.replaceAll('.', '').toLowerCase()}`);
    if (!pack) throw new Error(`No pack ${packName}`);
    return (await pack.getDocuments()).map((doc: any) => ({
      id: doc.id,
      name: String(doc.name ?? ''),
      importId: String(doc.flags?.starwarsffg?.ffgimportid ?? ''),
    }));
  }, packName);
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

/**
 * Open a second window on the same document, using one of its other registered sheet classes.
 *
 * A document caches one sheet, so `openSheet` twice is one window. Two windows means two classes -
 * the system registers a v1 and a v2 for both actors and items - which is also the only way a user
 * ends up with two open at once.
 */
export async function openSheetAs(page: Page, uuid: Uuid, sheetId: string): Promise<string> {
  const result = await page.evaluate(async ({ uuid, sheetId }) => {
    const doc = await fromUuid(uuid);
    if (!doc) return { error: `No document at ${uuid}` };

    const registered = CONFIG[doc.documentName]?.sheetClasses?.[doc.type] ?? {};
    const entry = registered[sheetId];
    if (!entry) {
      return { error: `no sheet "${sheetId}" for ${doc.type}. It has: ${Object.keys(registered).join(', ')}` };
    }

    const sheet = new entry.cls(doc, { editable: true });
    await sheet.render(true);

    for (let i = 0; i < 200; i++) {
      const root = sheet.element?.[0] ?? sheet.element;
      if (root?.id && document.getElementById(root.id)) return { id: root.id };
      await new Promise((r) => setTimeout(r, 25));
    }
    return { error: 'the second sheet never appeared in the DOM' };
  }, { uuid, sheetId });

  if ('error' in result) throw new Error(`Opening ${uuid} as ${sheetId}: ${result.error}`);
  return result.id as string;
}

/**
 * Whether a particular window is still on screen, by the id `openSheet` handed back.
 *
 * Asked by id rather than by document, so it still answers once the document is gone - which is
 * the only interesting moment for a window that should have closed with it.
 */
export async function isWindowOpen(page: Page, windowId: string): Promise<boolean> {
  return page.evaluate((windowId) => Boolean(document.getElementById(windowId)), windowId);
}

/**
 * Whether a document's sheet is on screen.
 *
 * Both halves matter: a sheet can believe it has closed while its window is still in the DOM, and
 * that is what "it does not close until a refresh" looks like from the outside.
 */
export async function isSheetOpen(page: Page, uuid: Uuid): Promise<boolean> {
  return page.evaluate(async (uuid) => {
    const doc = await fromUuid(uuid);
    const sheet = doc?._sheet;
    if (!sheet) return false;
    const root = sheet.element?.[0] ?? sheet.element;
    return Boolean(sheet.rendered) || Boolean(root?.id && document.getElementById(root.id));
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
 * An item's modifier-backed Active Effects, and any that no longer name a modifier.
 */
export async function readModifierEffects(page: Page, uuid: Uuid): Promise<{
  effects: { name: string; disabled: boolean; keys: string[]; changes: Record<string, number> }[];
  orphaned: string[];
}> {
  return page.evaluate(async (uuid) => {
    const item = await fromUuid(uuid);
    if (!item) throw new Error(`No item at ${uuid}`);
    const attributes = Object.keys(item.system?.attributes ?? {});
    const effects: {
      name: string; disabled: boolean; keys: string[]; changes: Record<string, number>;
    }[] = item.effects.contents.map((effect: any) => ({
      name: String(effect.name ?? ''),
      disabled: Boolean(effect.disabled),
      keys: effect.changes.map((change: any) => String(change.key)),
      changes: Object.fromEntries(
        effect.changes.map((change: any) => [String(change.key), Number(change.value)])),
    }));
    return {
      effects,
      // "(inherent)" is the item's own, and is named for the item rather than for a modifier
      orphaned: effects
        .filter((effect) => effect.name.startsWith('attr') && !attributes.includes(effect.name))
        .map((effect) => effect.name),
    };
  }, uuid);
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
  const problem = await tryDropOntoItem(page, parentUuid, droppedUuid);
  if (problem) throw new Error(`Dropping ${droppedUuid} onto ${parentUuid} failed: ${problem}`);
}

/**
 * The same drop, for cases where being refused is the point.
 */
export async function tryDropOntoItem(
  page: Page, parentUuid: Uuid, droppedUuid: Uuid,
): Promise<string | null> {
  return page.evaluate(async ({ parentUuid, droppedUuid }) => {
    const parent = await fromUuid(parentUuid);
    if (!parent) return `No item at ${parentUuid}`;
    const dropped = await fromUuid(droppedUuid);
    if (!dropped) return `No item at ${droppedUuid}`;
    const signature = (doc: any) => {
      const modifiers = doc?.system?.itemmodifier ?? [];
      return {
        count: (doc?.system?.itemattachment?.length ?? 0) + modifiers.length,
        ranks: modifiers.reduce(
          (sum: number, m: any) => sum + (parseInt(m?.system?.rank, 10) || 0), 0),
      };
    };
    const before = signature(parent);

    await parent.sheet._onDropItem({
      currentTarget: null,
      preventDefault: () => {},
      stopPropagation: () => {},
      dataTransfer: { getData: () => JSON.stringify({ type: 'Item', uuid: droppedUuid }) },
    });

    const now = signature(await fromUuid(parentUuid));
    if (now.count > before.count || now.ranks > before.ranks) return null;

    // Say which of the two gates turned it away
    const carrier = parent.type;
    const droppedType = dropped.system?.type;
    const typeOk = (carrier === 'shipweapon' && droppedType === 'weapon') ||
      carrier === droppedType || droppedType === 'all' || carrier === 'itemattachment';
    if (!typeOk) {
      return `type mismatch: a "${droppedType}" ${dropped.type} onto a "${carrier}"`;
    }
    if (dropped.type === 'itemattachment') {
      const budget = parent.system?.hardpoints?.adjusted;
      const cost = dropped.system?.hardpoints?.value;
      if (budget - cost < 0) return `not enough hardpoints: ${budget} available, needs ${cost}`;
    }
    return 'the sheet declined the drop, but neither the type nor the hardpoint gate explains it';
  }, { parentUuid, droppedUuid });
}

/**
 * Remove an attachment - or a quality - from an item, through the sheet's own delete control.
 */
export async function removeEmbedded(
  page: Page, itemUuid: Uuid, kind: 'itemattachment' | 'itemmodifier' = 'itemattachment',
  index = 0,
): Promise<void> {
  await openSheet(page, itemUuid);

  const problem = await page.evaluate(async ({ itemUuid, kind, index }) => {
    const item = await fromUuid(itemUuid);
    if (!item) return `No item at ${itemUuid}`;
    const before = item.system?.[kind]?.length ?? 0;
    if (index >= before) return `no ${kind} at index ${index} (the item has ${before})`;

    const sheet = item.sheet;
    sheet._tabs?.[0]?.activate?.('attributes');

    const root = sheet.element?.[0] ?? sheet.element;
    const row = root?.querySelector?.(
      `li[data-item-type="${kind}"][data-item-index="${index}"]`);
    if (!row) return `the sheet rendered no ${kind} row at index ${index}`;
    const control = row.querySelector('.item-delete');
    if (!control) return `the ${kind} row at index ${index} has no delete control`;

    control.click();

    const deadline = Date.now() + 5000;
    for (;;) {
      const now = (await fromUuid(itemUuid))?.system?.[kind]?.length ?? 0;
      if (now < before) return null;
      if (Date.now() > deadline) return `the ${kind} array never shrank below ${before}`;
      await new Promise((r) => setTimeout(r, 50));
    }
  }, { itemUuid, kind, index });

  await closeSheet(page, itemUuid);
  if (problem) throw new Error(`Removing ${kind}[${index}] from ${itemUuid} failed: ${problem}`);
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

/**
 * Run the talent / upgrade editor over a specialization, force power or signature ability.
 */
export async function applyProgressionEditors(page: Page, uuid: Uuid): Promise<void> {
  const problem = await page.evaluate(async (uuid) => {
    const item = await fromUuid(uuid);
    if (!item) return `No item at ${uuid}`;

    const field = item.type === 'specialization' ? 'talents'
      : ['forcepower', 'signatureability'].includes(item.type) ? 'upgrades'
      : null;
    if (!field) return null;

    const load = (p: string) => import(/* @vite-ignore */ `/systems/starwarsffg/modules/${p}`);
    const editors = await load('items/item-editor.js');
    const Editor = field === 'talents' ? editors.talentEditor : editors.forcePowerEditor;

    // Snapshot first
    const nodes = Object.entries(
      foundry.utils.deepClone(item.system?.[field] ?? {}) as Record<string, any>,
    ).filter(([, node]) => Object.keys(node?.attributes ?? {}).length);

    for (const [key, node] of nodes) {
      const data: Record<string, unknown> = {
        sourceObject: item,
        clickedObject: node,
        modifierTypes: CONFIG.FFG.itemmodifier_types,
        modifierChoices: CONFIG.FFG.allowableModifierChoices,
      };
      data[field === 'talents' ? 'talentId' : 'upgradeId'] = key;

      const form: Record<string, unknown> = { system: { attributes: node.attributes } };
      // The talent editor reads the activation straight out of the form to build its label.
      if (field === 'talents') form.activation = node.activation ?? 'Passive';

      await new Editor(data)._updateObject(null, form);
    }

    const ItemHelpers = (await load('helpers/item-helpers.js')).default;
    const reloaded = await fromUuid(uuid);
    await ItemHelpers.syncAEStatus(reloaded, reloaded.getEmbeddedCollection('ActiveEffect'));
    return null;
  }, uuid);

  if (problem) throw new Error(`Running the progression editor on ${uuid} failed: ${problem}`);
}

/**
 * Drop a talent item onto one of a specialization's tree nodes, as dragging it there does.
 */
export async function dropTalentOntoSpecialization(
  page: Page, specUuid: Uuid, talentUuid: Uuid, nodeKey: string,
): Promise<void> {
  await openSheet(page, specUuid);

  const problem = await page.evaluate(async ({ specUuid, talentUuid, nodeKey }) => {
    const spec = await fromUuid(specUuid);
    if (!spec) return `No item at ${specUuid}`;
    const sheet = spec.sheet;
    const root = sheet.element?.[0] ?? sheet.element;
    const node = root?.querySelector?.(`.specialization-talent[id="${nodeKey}"]`);
    if (!node) return `the sheet rendered no talent node "${nodeKey}"`;

    await sheet._onDropTalentToSpecialization({
      currentTarget: node,
      target: node,
      preventDefault: () => {},
      stopPropagation: () => {},
      dataTransfer: { getData: () => JSON.stringify({ type: 'Item', uuid: talentUuid }) },
    });
    return null;
  }, { specUuid, talentUuid, nodeKey });

  await closeSheet(page, specUuid);
  if (problem) throw new Error(`Dropping ${talentUuid} onto ${specUuid} node "${nodeKey}": ${problem}`);
}

/**
 * Submit a talent / upgrade node's editor with no attributes, which is how the UI removes them.
 */
export async function clearProgressionNode(
  page: Page, uuid: Uuid, nodeKey: string,
): Promise<void> {
  const problem = await page.evaluate(async ({ uuid, nodeKey }) => {
    const item = await fromUuid(uuid);
    if (!item) return `No item at ${uuid}`;
    const field = item.type === 'specialization' ? 'talents'
      : ['forcepower', 'signatureability'].includes(item.type) ? 'upgrades'
      : null;
    if (!field) return `${item.type} has no talents or upgrades`;

    const node = item.system?.[field]?.[nodeKey];
    if (!node) return `no ${field} node "${nodeKey}" on ${item.name}`;

    const load = (p: string) => import(/* @vite-ignore */ `/systems/starwarsffg/modules/${p}`);
    const editors = await load('items/item-editor.js');
    const Editor = field === 'talents' ? editors.talentEditor : editors.forcePowerEditor;

    const data: Record<string, unknown> = {
      sourceObject: item,
      clickedObject: foundry.utils.deepClone(node),
      modifierTypes: CONFIG.FFG.itemmodifier_types,
      modifierChoices: CONFIG.FFG.allowableModifierChoices,
    };
    data[field === 'talents' ? 'talentId' : 'upgradeId'] = nodeKey;

    const form: Record<string, unknown> = { system: { attributes: {} } };
    if (field === 'talents') form.activation = node.activation ?? 'Passive';

    await new Editor(data)._updateObject(null, form);
    return null;
  }, { uuid, nodeKey });

  if (problem) throw new Error(`Clearing node "${nodeKey}" on ${uuid} failed: ${problem}`);
}

/**
 * Learn or unlearn a talent / upgrade node, the way buying one from the sheet does.
 */
export async function setLearned(
  page: Page, itemUuid: Uuid, nodeKey: string, learned: boolean,
): Promise<void> {
  const problem = await page.evaluate(async ({ itemUuid, nodeKey, learned }) => {
    const item = await fromUuid(itemUuid);
    if (!item) return `No item at ${itemUuid}`;
    const field = item.type === 'specialization' ? 'talents'
      : ['forcepower', 'signatureability'].includes(item.type) ? 'upgrades'
      : null;
    if (!field) return `${item.type} has no talents or upgrades to learn`;
    if (!item.system?.[field]?.[nodeKey]) return `no ${field} node "${nodeKey}" on ${item.name}`;

    await item.update({ [`system.${field}.${nodeKey}.islearned`]: learned });

    const load = (p: string) => import(/* @vite-ignore */ `/systems/starwarsffg/modules/${p}`);
    const ItemHelpers = (await load('helpers/item-helpers.js')).default;
    const reloaded = await fromUuid(itemUuid);
    await ItemHelpers.syncAEStatus(reloaded, reloaded.getEmbeddedCollection('ActiveEffect'));
    return null;
  }, { itemUuid, nodeKey, learned });

  if (problem) throw new Error(`Setting islearned on ${itemUuid} failed: ${problem}`);
}

export interface ProgressionNode {
  name?: string;
  /** The system's spelling, lower case throughout. */
  islearned?: boolean;
  isRanked?: boolean;
  cost?: number;
  attributes?: Record<string, unknown>;
}

/**
 * Which field holds a type's progression nodes, or null for a type that has none.
 */
export function progressionField(type: string): 'talents' | 'upgrades' | null {
  if (type === 'specialization') return 'talents';
  return ['forcepower', 'signatureability'].includes(type) ? 'upgrades' : null;
}

/**
 * One talent / upgrade node as it is stored, or null when the item has no such node.
 */
export async function readProgressionNode(
  page: Page, itemUuid: Uuid, nodeKey: string,
): Promise<ProgressionNode | null> {
  const type = String(await read(page, itemUuid, 'type') ?? '');
  const field = progressionField(type);
  if (!field) throw new Error(`${type} has no talents or upgrades to read.`);
  const node = await read(page, itemUuid, `system.${field}.${nodeKey}`);
  return (node ?? null) as ProgressionNode | null;
}

/* -------------------------------------------- */
/*  Dialogs                                     */
/* -------------------------------------------- */

/** The labels on the buttons of the dialog currently up. */
export async function readDialogButtons(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const dialog = (Object.values(ui.windows ?? {}) as any[]).find((app) => app?.data?.buttons);
    return Object.values(dialog?.data?.buttons ?? {}).map((button: any) => String(button.label ?? ''));
  });
}

/**
 * Titles of the dialogs currently open, for tests whose point is that one appeared.
 */
export async function openDialogs(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Object.values(ui.windows ?? {})
      .filter((app: any) => app?.data?.buttons)
      .map((app: any) => String(app.title ?? '')));
}

/**
 * Wait for a dialog to open and return its title.
 */
export async function waitForDialog(
  page: Page, { title, timeout = 10_000 }: { title?: string | RegExp; timeout?: number } = {},
): Promise<string> {
  const pattern = title === undefined ? null : typeof title === 'string' ? title : title.source;

  const found = await page.evaluate(async ({ pattern, timeout }) => {
    const deadline = Date.now() + timeout;
    for (;;) {
      const dialog = (Object.values(ui.windows ?? {}) as any[]).find(
        (app) => app?.data?.buttons && (!pattern || new RegExp(pattern).test(String(app.title ?? ''))));
      if (dialog) return String(dialog.title ?? '');
      if (Date.now() > deadline) return null;
      await new Promise((r) => setTimeout(r, 25));
    }
  }, { pattern, timeout });

  if (found === null) {
    throw new Error(`No dialog${pattern ? ` titled /${pattern}/` : ''} opened within ${timeout}ms.`);
  }
  return found;
}

/**
 * Close every open dialog without answering it.
 */
export async function closeDialogs(page: Page): Promise<void> {
  await page.evaluate(async () => {
    for (const app of Object.values(ui.windows ?? {}) as any[]) {
      if (app?.data?.buttons) await app.close();
    }
  });
}

/**
 * Wait for a dialog to open, press one of its buttons, and wait for what it does to finish.
 */
export async function answerDialog(
  page: Page, button: string,
  { title, timeout = 10_000 }: { title?: string | RegExp; timeout?: number } = {},
): Promise<void> {
  const pattern = title === undefined ? null : typeof title === 'string' ? title : title.source;

  const problem = await page.evaluate(async ({ button, pattern, timeout }) => {
    const deadline = Date.now() + timeout;
    const matches = (app: any) =>
      app?.data?.buttons && (!pattern || new RegExp(pattern).test(String(app.title ?? '')));

    let dialog: any = null;
    for (;;) {
      dialog = Object.values(ui.windows ?? {}).find(matches);
      if (dialog) break;
      if (Date.now() > deadline) {
        const open = Object.values(ui.windows ?? {})
          .map((app: any) => String(app.title ?? '')).join(', ') || 'none';
        return `no dialog${pattern ? ` titled /${pattern}/` : ''} opened. Open windows: ${open}`;
      }
      await new Promise((r) => setTimeout(r, 25));
    }

    const spec = dialog.data.buttons[button];
    if (!spec) {
      return `the dialog has no "${button}" button; it offers ${Object.keys(dialog.data.buttons).join(', ')}`;
    }
    // A disabled button is how the drop dialog says the actor cannot afford the item, so it is a
    // refusal to report rather than a failure to click through.
    if (spec.disabled) return `the "${button}" button is disabled`;

    // Held on an object rather than in two locals: the only writer is the wrapper below, and a
    // local assigned solely from inside a closure reads as never-reassigned.
    const state: { settled: boolean; failure: string | null } = { settled: false, failure: null };
    const original = spec.callback;
    spec.callback = async (...args: unknown[]) => {
      try {
        if (original) await original(...args);
      } catch (err: any) {
        state.failure = err?.message ?? String(err);
      } finally {
        state.settled = true;
      }
    };

    let control: HTMLElement | null = null;
    while (!control) {
      const root = dialog.element?.[0] ?? dialog.element;
      control = root?.querySelector?.(`button[data-button="${button}"]`) ?? null;
      if (control) break;
      if (Date.now() > deadline) {
        const offered = [...(root?.querySelectorAll?.('button[data-button]') ?? [])]
          .map((el: any) => el.dataset.button).join(', ') || 'none';
        return `the dialog rendered no "${button}" button. It offers: ${offered}`;
      }
      await new Promise((r) => setTimeout(r, 25));
    }
    control.click();

    while (!state.settled) {
      if (Date.now() > deadline) return `the "${button}" callback never finished`;
      await new Promise((r) => setTimeout(r, 25));
    }
    if (state.failure) return `the "${button}" callback threw: ${state.failure}`;

    // Foundry closes the dialog only after the callback resolves, so returning the moment the
    // callback settles leaves it in ui.windows for a tick or two. The next answerDialog matches on
    // "any window with buttons", so it would find this one still standing and press its button a
    // second time - running the previous purchase again, at the cost its closure captured, and
    // never touching the one the test asked for.
    while ((ui.windows ?? {})[dialog.appId]) {
      if (Date.now() > deadline) return `the dialog did not close after the "${button}" callback`;
      await new Promise((r) => setTimeout(r, 25));
    }
    return null;
  }, { button, pattern, timeout });

  if (problem) throw new Error(`Answering a dialog failed: ${problem}`);
}

/* -------------------------------------------- */
/*  Purchases                                   */
/* -------------------------------------------- */

/** The two buttons every purchase dialog carries, per the handlers that build them. */
const CONFIRM = 'done';
const CANCEL = 'cancel';

/**
 * Confirm or cancel a purchase dialog, leaving nothing standing if the answer goes wrong.
 */
async function answerPurchase(page: Page, confirm: boolean): Promise<void> {
  try {
    await answerDialog(page, confirm ? CONFIRM : CANCEL);
  } catch (err) {
    await closeDialogs(page);
    throw err;
  }
}

/**
 * Buy a talent in a specialization, or an upgrade in a force power or signature ability.
 */
export async function buyProgressionNode(
  page: Page, itemUuid: Uuid, nodeKey: string, { confirm = true } = {},
): Promise<void> {
  await openSheet(page, itemUuid);

  const problem = await page.evaluate(async ({ itemUuid, nodeKey }) => {
    const item = await fromUuid(itemUuid);
    if (!item) return `No item at ${itemUuid}`;
    if (!item.isEmbedded) {
      return `${item.name} is not on an actor, so the purchase control is not rendered`;
    }
    const root = item.sheet.element?.[0] ?? item.sheet.element;
    const control = root?.querySelector?.(`.ffg-purchase[data-upgrade-id="${nodeKey}"]`);
    if (!control) {
      const offered = [...(root?.querySelectorAll?.('.ffg-purchase[data-upgrade-id]') ?? [])]
        .map((el: any) => el.dataset.upgradeId).join(', ') || 'none';
      return `the sheet rendered no purchase control for node "${nodeKey}". It offers: ${offered}`;
    }
    control.click();
    return null;
  }, { itemUuid, nodeKey });

  if (problem) {
    await closeSheet(page, itemUuid);
    throw new Error(`Buying node "${nodeKey}" on ${itemUuid} failed: ${problem}`);
  }

  try {
    await answerPurchase(page, confirm);
  } finally {
    // The callback writes through `this.element`, so the sheet stays open until it has finished.
    await closeSheet(page, itemUuid);
  }
}

/**
 * Buy a rank in a skill, from the actor sheet's own control.
 */
export async function buySkillRank(
  page: Page, actorUuid: Uuid, skill: string, { confirm = true } = {},
): Promise<void> {
  await clickActorPurchase(page, actorUuid, `[data-ability="${skill}"] .ffg-purchase[data-buy-action="skill"]`,
    `the sheet rendered no purchase control for the skill "${skill}"`);
  await answerPurchase(page, confirm);
}

/**
 * Buy a rank in a characteristic. Costs `(current + 1) * 10`, read live off the actor, so a
 * characteristic already raised by an item is dearer than its printed value suggests.
 */
export async function buyCharacteristicRank(
  page: Page, actorUuid: Uuid, characteristic: string,
  { confirm = true, allowEditMode = false } = {},
): Promise<void> {
  await clickActorPurchase(page, actorUuid,
    `.ffg-purchase[data-buy-characteristic="${characteristic}"]`,
    `the sheet rendered no purchase control for the characteristic "${characteristic}"`,
    { allowEditMode });
  // The sheet refuses before it asks anything, so there is no dialog to answer.
  if (!allowEditMode) await answerPurchase(page, confirm);
}

/**
 * Click one of the actor sheet's "buy one of these" arrows - specialization, signature ability,
 * force power or talent - which opens a dialog listing what the character can buy.
 */
export async function browsePurchases(
  page: Page, actorUuid: Uuid, action: 'specialization' | 'signatureability' | 'forcepower' | 'talent',
): Promise<void> {
  await clickActorPurchase(page, actorUuid, `.ffg-purchase[data-buy-action="${action}"]`,
    `the sheet rendered no purchase control for ${action}`);
}

/** Open an actor's sheet and click one of its purchase controls. */
async function clickActorPurchase(
  page: Page, actorUuid: Uuid, selector: string, missing: string,
  { allowEditMode = false } = {},
): Promise<void> {
  await openSheet(page, actorUuid);

  const problem = await page.evaluate(async ({ actorUuid, selector, missing, allowEditMode }) => {
    const actor = await fromUuid(actorUuid);
    if (!actor) return `No actor at ${actorUuid}`;
    if (!allowEditMode && actor.getFlag('starwarsffg', 'config.enableEditMode')) {
      return 'the actor is in edit mode, which refuses every purchase';
    }
    const root = actor.sheet.element?.[0] ?? actor.sheet.element;
    const control = root?.querySelector?.(selector);
    if (!control) return missing;
    // Deliberately not scrolled into view or checked for visibility: these controls live on tabs
    // that may not be showing, and the handlers do not care which tab is open.
    control.click();
    return null;
  }, { actorUuid, selector, missing, allowEditMode });

  if (problem) throw new Error(`Clicking a purchase control on ${actorUuid} failed: ${problem}`);
}

/**
 * Drop a talent, specialization, force power or signature ability on an actor sheet and answer the
 * dialog it raises.
 */
export async function dropForPurchase(
  page: Page, actorUuid: Uuid, itemUuid: Uuid,
  choice: 'purchase' | 'grant' | 'dismiss' = 'purchase',
): Promise<Uuid | null> {
  await openSheet(page, actorUuid);

  const started = await page.evaluate(async ({ actorUuid, itemUuid }) => {
    const actor = await fromUuid(actorUuid);
    if (!actor) return `No actor at ${actorUuid}`;
    const w = window as any;
    w.__qaDropBefore = new Set(actor.items.map((i: any) => i.id));
    // Not awaited: for these types the call returns once the dialog is on screen, and for every
    // other type it resolves normally - either way the answer has to come from outside this call.
    w.__qaDrop = Promise.resolve(actor.sheet._onDropItem(
      { preventDefault: () => {}, stopPropagation: () => {}, currentTarget: null, target: null },
      { type: 'Item', uuid: itemUuid },
    )).catch((err: any) => { w.__qaDropError = err?.message ?? String(err); });
    return null;
  }, { actorUuid, itemUuid });

  if (started) throw new Error(`Dropping ${itemUuid} on ${actorUuid} for purchase: ${started}`);

  try {
    if (choice === 'dismiss') {
      // The dialog is rendered several awaits into _onDropItem, so closing without waiting for it
      // would race past and leave it standing on a page the next test inherits.
      await waitForDialog(page);
      await closeDialogs(page);
    } else {
      await answerDialog(page, choice);
    }
  } catch (err) {
    await closeDialogs(page);
    throw err;
  }

  const result = await page.evaluate(async ({ actorUuid, expectItem }) => {
    const outcome: { error: string | null; uuid: string | null } = { error: null, uuid: null };
    const w = window as any;
    await w.__qaDrop;
    outcome.error = w.__qaDropError ?? null;
    const before = w.__qaDropBefore ?? new Set();
    delete w.__qaDrop;
    delete w.__qaDropError;
    delete w.__qaDropBefore;
    if (outcome.error) return outcome;

    const actor = await fromUuid(actorUuid);
    for (let i = 0; i < 100; i++) {
      const landed = actor.items.find((item: any) => !before.has(item.id));
      if (landed) {
        outcome.uuid = landed.uuid;
        return outcome;
      }
      await new Promise((r) => setTimeout(r, 25));
    }
    // Dismissing is supposed to leave nothing behind, so an empty result is the expected outcome
    if (expectItem) outcome.error = 'the dialog was answered but no item appeared on the actor';
    return outcome;
  }, { actorUuid, expectItem: choice !== 'dismiss' });

  if (result.error) throw new Error(`Dropping ${itemUuid} on ${actorUuid}: ${result.error}`);
  return result.uuid;
}

/**
 * Copy a compendium document into the world, the way dragging one out of a pack does.
 */
export async function copyToWorld(page: Page, uuid: Uuid, name?: string): Promise<Uuid> {
  return page.evaluate(async ({ uuid, name }) => {
    const source = await fromUuid(uuid);
    if (!source) throw new Error(`No document at ${uuid}`);
    const data = source.toObject();
    delete data._id;
    if (name) data.name = name;
    const copy = await Item.create(data);
    if (!copy) throw new Error(`Copying ${uuid} into the world returned nothing`);
    return copy.uuid;
  }, { uuid, name });
}

/**
 * Press "Add Modification" in the attachment editor. The modification it makes carries no mods.
 */
export async function addModification(
  page: Page, itemUuid: Uuid, attachmentIndex: number,
): Promise<void> {
  const problem = await page.evaluate(async ({ itemUuid, attachmentIndex }) => {
    const item = await fromUuid(itemUuid);
    if (!item) return `No item at ${itemUuid}`;
    const attachment = item.system?.itemattachment?.[attachmentIndex];
    if (!attachment) return `no attachment at index ${attachmentIndex}`;

    const load = (p: string) => import(/* @vite-ignore */ `/systems/starwarsffg/modules/${p}`);
    const { itemEditor } = await load('items/item-editor.js');

    // The same data the sheet's edit control passes (items/item-sheet-ffg.js:672).
    const typeChoices: Record<string, string> = {};
    for (const key of Object.keys(CONFIG.FFG.itemmodifier_types)) {
      const entry = CONFIG.FFG.itemmodifier_types[key];
      typeChoices[entry.value] = game.i18n.localize(entry.label);
    }

    const editor = new itemEditor({ sourceObject: item, clickedObject: attachment, typeChoices });
    await editor.render(true);

    let root: any = null;
    for (let i = 0; i < 200 && !root; i++) {
      const el = editor.element?.[0] ?? editor.element;
      if (el?.id && document.getElementById(el.id)) root = el;
      else await new Promise((r) => setTimeout(r, 25));
    }
    if (!root) return 'the attachment editor never appeared';

    const before = attachment.system.itemmodifier.length;
    const add = root.querySelector('.add-modification[data-action="create"]');
    if (!add) return 'the editor rendered no Add Modification button';
    add.click();

    for (let i = 0; i < 200; i++) {
      const now = (await fromUuid(itemUuid))
        ?.system?.itemattachment?.[attachmentIndex]?.system?.itemmodifier?.length;
      if (now > before) break;
      await new Promise((r) => setTimeout(r, 25));
    }
    await editor.close();
    return null;
  }, { itemUuid, attachmentIndex });

  if (problem) throw new Error(`Adding a Modification to ${itemUuid}: ${problem}`);
}

/**
 * Tick or untick a Modification's "Installed?" box in the attachment editor.
 */
export async function setModificationInstalled(
  page: Page, itemUuid: Uuid, attachmentIndex: number, modifierIndex: number, installed: boolean,
): Promise<void> {
  const problem = await page.evaluate(async ({ itemUuid, attachmentIndex, modifierIndex, installed }) => {
    const item = await fromUuid(itemUuid);
    if (!item) return `No item at ${itemUuid}`;
    const attachment = item.system?.itemattachment?.[attachmentIndex];
    if (!attachment) return `no attachment at index ${attachmentIndex}`;
    if (!attachment.system?.itemmodifier?.[modifierIndex]) {
      return `no modifier at index ${modifierIndex} inside that attachment`;
    }

    const load = (p: string) => import(/* @vite-ignore */ `/systems/starwarsffg/modules/${p}`);
    const { itemEditor } = await load('items/item-editor.js');

    // The same data the sheet's edit control passes (items/item-sheet-ffg.js:672).
    const typeChoices: Record<string, string> = {};
    for (const key of Object.keys(CONFIG.FFG.itemmodifier_types)) {
      const entry = CONFIG.FFG.itemmodifier_types[key];
      typeChoices[entry.value] = game.i18n.localize(entry.label);
    }

    const editor = new itemEditor({ sourceObject: item, clickedObject: attachment, typeChoices });
    await editor.render(true);

    let root: any = null;
    for (let i = 0; i < 200 && !root; i++) {
      const el = editor.element?.[0] ?? editor.element;
      if (el?.id && document.getElementById(el.id)) root = el;
      else await new Promise((r) => setTimeout(r, 25));
    }
    if (!root) return 'the attachment editor never appeared';

    const box = root.querySelector(
      `input[name="system.itemmodifier[${modifierIndex}].system.active"]`);
    if (!box) return `the editor rendered no Installed checkbox for modifier ${modifierIndex}`;
    box.checked = installed;

    await editor.submit();
    await editor.close();
    return null;
  }, { itemUuid, attachmentIndex, modifierIndex, installed });

  if (problem) throw new Error(`Setting Installed? on ${itemUuid}: ${problem}`);
}

/** Suspend or restore every Active Effect on a document. */
export async function setEffectsDisabled(
  page: Page, uuid: Uuid, disabled: boolean,
): Promise<void> {
  await page.evaluate(async ({ uuid, disabled }) => {
    const doc = await fromUuid(uuid);
    const effects = doc?.effects?.contents ?? [];
    for (const effect of effects) {
      if (effect.disabled !== disabled) await effect.update({ disabled });
    }
  }, { uuid, disabled });
}

/**
 * Put an item on an actor through the actor sheet's own drop handler.
 */
export async function dropOnActorSheet(
  page: Page, actorUuid: Uuid, itemUuid: Uuid, { allowEditMode = false } = {},
): Promise<Uuid> {
  const result = await page.evaluate(async ({ actorUuid, itemUuid, allowEditMode }) => {
    const actor = await fromUuid(actorUuid);
    if (!actor) return { error: `No actor at ${actorUuid}` };
    if (!allowEditMode && actor.getFlag('starwarsffg', 'config.enableEditMode')) {
      return { error: 'the actor is in edit mode, which refuses every drop' };
    }
    const before = new Set(actor.items.map((i: any) => i.id));

    const accepted = await actor.sheet._onDropItem(
      { preventDefault: () => {}, stopPropagation: () => {}, currentTarget: null, target: null },
      { type: 'Item', uuid: itemUuid },
    );

    // the handler answers `false` when it turns the drop away, before anything is created
    if (accepted === false) return { error: 'the sheet refused the drop' };

    // _onDropItemCreate resolves before the item is in the collection in some paths
    for (let i = 0; i < 100; i++) {
      const landed = actor.items.find((item: any) => !before.has(item.id));
      if (landed) return { uuid: landed.uuid };
      await new Promise((r) => setTimeout(r, 25));
    }
    return { error: 'the sheet accepted the drop but no item appeared on the actor' };
  }, { actorUuid, itemUuid, allowEditMode });

  if (result.error) throw new Error(`Dropping ${itemUuid} on ${actorUuid}: ${result.error}`);
  return result.uuid as Uuid;
}

/** A document's stored state, with the fields that differ between any two copies removed. */
export async function comparable(page: Page, uuid: Uuid): Promise<Record<string, unknown>> {
  return page.evaluate(async (uuid) => {
    const doc = await fromUuid(uuid);
    if (!doc) throw new Error(`No document at ${uuid}`);
    const data = doc.toObject();
    return {
      system: data.system,
      effects: (data.effects ?? []).map((e: any) => ({
        name: e.name,
        disabled: e.disabled ?? false,
        transfer: e.transfer ?? true,
        changes: (e.changes ?? []).map((c: any) => `${c.key} ${c.mode} ${c.value}`),
      })).sort((a: any, b: any) => a.name.localeCompare(b.name)),
    };
  }, uuid);
}

/**
 * The system's own idea of a document of this type: created bare, then submitted through its sheet.
 */
export async function systemDefault(page: Page, type: string): Promise<{
  /** Straight from the schema, before any sheet has touched it. */
  bare?: Record<string, unknown>;
  /** After a sheet submit - what a user gets by making one and closing the window. */
  system?: Record<string, unknown>;
  error?: string;
}> {
  return page.evaluate(async (type) => {
    let item: any;
    try {
      item = await Item.create({ name: `qa reference ${type}`, type });
      if (!item) return { error: 'Item.create returned nothing' };
      await item.sheet.render(true);
      for (let i = 0; i < 200; i++) {
        const el = item.sheet.element?.[0] ?? item.sheet.element;
        if (el?.id && document.getElementById(el.id)) break;
        await new Promise((r) => setTimeout(r, 25));
      }
      const bare = item.toObject().system;
      await item.sheet.submit();
      await item.sheet.close();
      const fresh = await fromUuid(item.uuid);
      return { bare, system: fresh.toObject().system };
    } catch (err: any) {
      return { error: `${err?.name ?? 'Error'}: ${err?.message ?? err}` };
    } finally {
      try { await item?.delete(); } catch { /* already gone */ }
    }
  }, type);
}

/**
 * Open a nested modifier's own editor and leave it open, handing back its window id.
 */
export async function openModifierEditor(page: Page, opts: {
  actorUuid?: Uuid; itemUuid: Uuid; modifierType: string; modifierIndex: number;
}): Promise<string> {
  const result = await page.evaluate(async (o) => {
    const actor = o.actorUuid ? await fromUuid(o.actorUuid) : null;
    const item = await fromUuid(o.itemUuid);
    if (!item) return { error: `No item at ${o.itemUuid}` };

    const load = (p: string) => import(/* @vite-ignore */ `/systems/starwarsffg/modules/${p}`);
    const EmbeddedItemHelpers = (await load('helpers/embeddeditem-helpers.js')).default;

    const before = new Set(Object.keys(ui.windows ?? {}));
    await EmbeddedItemHelpers.loadItemModifierSheet(
      item.id, o.modifierType, o.modifierIndex, actor?.id);

    for (let i = 0; i < 200; i++) {
      const sheet = Object.entries(ui.windows ?? {})
        .filter(([id]) => !before.has(id))
        .map(([, app]) => app)
        .find((app: any) => app?.object?.flags?.starwarsffg?.ffgIsTemp) as any;
      const root = sheet?.element?.[0] ?? sheet?.element;
      if (root?.id && document.getElementById(root.id)) return { id: root.id };
      await new Promise((r) => setTimeout(r, 25));
    }
    return { error: 'the modifier editor never opened' };
  }, opts);

  if ('error' in result) throw new Error(`Opening the editor on ${opts.itemUuid}: ${result.error}`);
  return result.id as string;
}

/**
 * Close a window by its own close control, as a user does.
 *
 * Says what it clicked when the window stays put, because a window that survives its own close
 * button is the interesting case and "still open" on its own says nothing about why.
 */
export async function closeWindow(page: Page, windowId: string): Promise<void> {
  // Foundry binds the header button listeners 500ms after the window renders, "to prevent
  // immediate interaction" (foundry.mjs:37503), so the first click can land on nothing. Clicking
  // again costs nothing once the window has gone.
  for (let attempt = 0; attempt < 6; attempt++) {
    const clicked = await clickCloseControl(page, windowId);
    if ('error' in clicked) throw new Error(`Closing ${windowId}: ${clicked.error}`);

    const gone = await page.locator(`#${windowId}`)
      .waitFor({ state: 'detached', timeout: 500 }).then(() => true).catch(() => false);
    if (gone) return;
  }

  await reportStuckWindow(page, windowId);
}

/** Click a window's own close control, and say what was clicked. */
async function clickCloseControl(
  page: Page, windowId: string,
): Promise<{ control: string } | { error: string }> {
  return page.evaluate((windowId) => {
    const root = document.getElementById(windowId);
    if (!root) return { error: 'that window is not on screen' };

    const header = root.querySelector('.window-header');
    const controls = [...(header?.querySelectorAll('a, button') ?? [])];
    const control = controls.find((el: any) =>
      el.classList.contains('close') || el.dataset?.action === 'close'
      || /close/i.test(el.getAttribute('aria-label') ?? ''));

    if (!control) {
      return { error: `no close control. The header holds: ${header?.innerHTML ?? '(no header)'}` };
    }
    (control as HTMLElement).click();
    return { control: (control as HTMLElement).outerHTML };
  }, windowId);
}

/**
 * Say why a window is still there, having been asked to close several times.
 */
async function reportStuckWindow(page: Page, windowId: string): Promise<void> {
  // Ask the application itself to close, to tell a refused close from an unwired button
  const direct = await page.evaluate(async (windowId) => {
    const app = (Object.values(ui.windows ?? {}) as any[]).find((candidate) => {
      const root = candidate?.element?.[0] ?? candidate?.element;
      return root?.id === windowId;
    });
    if (!app) return 'no application owns that window';
    try {
      await app.close();
      return document.getElementById(windowId) ? 'close() left it on screen' : 'close() closed it';
    } catch (err: any) {
      return `close() threw: ${err?.message ?? err}`;
    }
  }, windowId);

  throw new Error(
    `Closing ${windowId}: it is still on screen after its close control was clicked several ` +
    `times. Asked directly, ${direct}.`,
  );
}

/**
 * Open a nested modifier the way the sheet does, then walk its parent chain back to a real item.
 */
export async function writeThroughParentChain(page: Page, opts: {
  actorUuid: Uuid; itemUuid: Uuid; modifierType: string; modifierIndex: number;
  data: Record<string, unknown>;
}): Promise<void> {
  const problem = await page.evaluate(async (o) => {
    const actor = await fromUuid(o.actorUuid);
    const item = await fromUuid(o.itemUuid);
    if (!actor || !item) return 'no actor or item';

    const load = (p: string) => import(/* @vite-ignore */ `/systems/starwarsffg/modules/${p}`);
    const EmbeddedItemHelpers = (await load('helpers/embeddeditem-helpers.js')).default;

    const before = new Set(Object.keys(ui.windows ?? {}));
    await EmbeddedItemHelpers.loadItemModifierSheet(
      item.id, o.modifierType, o.modifierIndex, actor.id);

    let sheet: any = null;
    for (let i = 0; i < 100 && !sheet; i++) {
      sheet = Object.entries(ui.windows ?? {})
        .filter(([id]) => !before.has(id))
        .map(([, app]) => app)
        .find((app: any) => app?.object?.flags?.starwarsffg?.ffgIsTemp);
      if (!sheet) await new Promise((r) => setTimeout(r, 25));
    }
    if (!sheet) return 'the modifier editor never opened';

    try {
      await EmbeddedItemHelpers.updateRealObject(sheet.object, o.data);
      return null;
    } finally {
      // Without `submit: false` the close submits the form, and this sheet belongs to a temporary
      // item with no _id - the update is then unroutable and the server throws on a missing
      // collection (`parseUuid(parentUuid)?.collection.db` is undefined, so `.semaphore` fails).
      await sheet.close({ submit: false });
    }
  }, opts);

  if (problem) throw new Error(`Writing through the chain on ${opts.itemUuid}: ${problem}`);
}

export async function resolveParentChain(page: Page, opts: {
  /** Omit for a world item, which is the branch that falls back to game.items.get. */
  actorUuid?: Uuid; itemUuid: Uuid; modifierType: string; modifierIndex: number;
}): Promise<{ uuid: string | null; name: string | null; chain: string[]; hops: number }> {
  const result = await page.evaluate(async ({ actorUuid, itemUuid, modifierType, modifierIndex }) => {
    const actor = actorUuid ? await fromUuid(actorUuid) : null;
    const item = await fromUuid(itemUuid);
    if (!item || (actorUuid && !actor)) return { error: 'no actor or item' };

    const load = (p: string) => import(/* @vite-ignore */ `/systems/starwarsffg/modules/${p}`);
    const EmbeddedItemHelpers = (await load('helpers/embeddeditem-helpers.js')).default;

    const before = new Set(Object.keys(ui.windows ?? {}));
    await EmbeddedItemHelpers.loadItemModifierSheet(
      item.id, modifierType, modifierIndex, actor?.id);

    // the editor is rendered on a temporary Item, which is the thing carrying the chain
    let sheet: any = null;
    for (let i = 0; i < 100 && !sheet; i++) {
      sheet = Object.entries(ui.windows ?? {})
        .filter(([id]) => !before.has(id))
        .map(([, app]) => app)
        .find((app: any) => app?.object?.flags?.starwarsffg?.ffgIsTemp);
      if (!sheet) await new Promise((r) => setTimeout(r, 25));
    }
    if (!sheet) return { error: 'the modifier editor never opened' };

    // what the chain looks like on the way up, before it is resolved
    const chain: string[] = [];
    let flags = sheet.object.flags.starwarsffg;
    while (flags) {
      chain.push(flags.ffgUuid ? `uuid:${flags.ffgUuid}` : `temp:${flags.ffgTempItemType ?? '?'}`);
      flags = flags.ffgParent?.starwarsffg;
    }

    try {
      // _getRealItem hands back { realItem, flagHierarchy }, not the item itself
      const { realItem, flagHierarchy } = await EmbeddedItemHelpers._getRealItem(sheet.object);
      return {
        uuid: realItem?.uuid ?? null,
        name: realItem?.name ?? null,
        chain,
        hops: (flagHierarchy ?? []).length,
      };
    } finally {
      await sheet.close({ submit: false });   // see the note in writeThroughParentChain
    }
  }, opts);

  if ('error' in result && result.error) {
    throw new Error(`Walking the parent chain on ${opts.itemUuid}: ${result.error}`);
  }
  return result as { uuid: string | null; name: string | null; chain: string[]; hops: number };
}

/**
 * Drop a document onto a species or career sheet, which is how those two record a *link*.
 */
export async function dropOnReferenceSheet(
  page: Page, holderUuid: Uuid, droppedUuid: Uuid,
): Promise<void> {
  const problem = await page.evaluate(async ({ holderUuid, droppedUuid }) => {
    const holder = await fromUuid(holderUuid);
    if (!holder) return `No item at ${holderUuid}`;
    const handler = holder.type === 'species' ? 'onDropItemToSpecies' : '_onDragItemCareer';
    if (typeof holder.sheet[handler] !== 'function') {
      return `${holder.type} sheets have no ${handler}`;
    }
    await holder.sheet[handler]({
      preventDefault: () => {},
      stopPropagation: () => {},
      currentTarget: null,
      dataTransfer: { getData: () => JSON.stringify({ type: 'Item', uuid: droppedUuid }) },
    });
    return null;
  }, { holderUuid, droppedUuid });

  if (problem) throw new Error(`Dropping ${droppedUuid} onto ${holderUuid}: ${problem}`);
}

/** Where each sheet type accepts a drop, as its own `DragDrop` registration names it. */
const DROP_TARGET: Record<string, string> = {
  species: '.tab.talents',
  career: '.tab.career',
  specialization: '.specialization-talent',
};

/**
 * Drop one item onto another's *rendered sheet*, as a real drag would.
 */
export async function dropOnSheetElement(
  page: Page, holderUuid: Uuid, droppedUuid: Uuid,
): Promise<void> {
  const problem = await page.evaluate(async ({ holderUuid, droppedUuid, targets }) => {
    const holder = await fromUuid(holderUuid);
    if (!holder) return `No item at ${holderUuid}`;

    const selector = targets[holder.type];
    if (!selector) {
      return `${holder.type} sheets take no drops. These do: ${Object.keys(targets).join(', ')}`;
    }

    const root = holder.sheet?.element?.[0] ?? holder.sheet?.element;
    if (!root) return `the sheet for ${holder.name} is not rendered`;

    const target = root.querySelector?.(selector);
    if (!target) return `its sheet has no ${selector} to drop on`;

    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', JSON.stringify({ type: 'Item', uuid: droppedUuid }));
    target.dispatchEvent(new DragEvent('drop', { dataTransfer, bubbles: true, cancelable: true }));

    // the handler is async and nothing returns it, so let the write it makes land
    await new Promise((r) => setTimeout(r, 250));
    return null;
  }, { holderUuid, droppedUuid, targets: DROP_TARGET });

  if (problem) throw new Error(`Dropping ${droppedUuid} on the sheet for ${holderUuid}: ${problem}`);
}

/**
 * Submit an item's own sheet, for the writes that only happen there.
 */
export async function submitSheet(page: Page, uuid: Uuid): Promise<void> {
  await openSheet(page, uuid);
  await page.evaluate(async (uuid) => {
    const doc = await fromUuid(uuid);
    await doc?.sheet?.submit();
  }, uuid);
  await closeSheet(page, uuid);
}

/* -------------------------------------------- */
/*  Settings                                    */
/* -------------------------------------------- */

/**
 * Set a system setting, handing back what it was so a caller can put it back.
 *
 * Read and write are separate calls because some settings reload the page from their `onChange` -
 * `useGenericSlots` swaps the combat tracker out, so the world has to come back up around it
 * (swffg-main.js:343). The reload tears down the context the write was evaluating in, which
 * surfaces as an error after the write has already landed; the old value has to be in hand before
 * that can happen. Waiting for the page to come back is `world.setSetting`'s job.
 */
/** Read a setting's current value. */
export async function readSetting(
  page: Page, key: string, namespace = 'starwarsffg',
): Promise<any> {
  return page.evaluate(
    ({ key, namespace }) => game.settings.get(namespace, key) ?? null, { key, namespace });
}

export async function setSetting(
  page: Page, key: string, value: unknown, namespace = 'starwarsffg',
): Promise<unknown> {
  const before = await page.evaluate(
    ({ key, namespace }) => game.settings.get(namespace, key) ?? null, { key, namespace });

  await page.evaluate(async ({ key, value, namespace }) => {
    await game.settings.set(namespace, key, value);
  }, { key, value, namespace }).catch((err: unknown) => {
    if (!/context was destroyed|Execution context|navigation/i.test(String(err))) throw err;
  });

  return before;
}

/* -------------------------------------------- */
/*  Scenes, tokens and combat                   */
/* -------------------------------------------- */

/**
 * A scene, activated and viewed.
 */
export async function createScene(page: Page, name: string, timeout = 30_000): Promise<Uuid> {
  return page.evaluate(async ({ name, timeout }) => {
    const scene = await Scene.create({ name, width: 1000, height: 1000, grid: { type: 1, size: 100 } });
    if (!scene) throw new Error(`Scene.create returned nothing for "${name}"`);

    // `activate` both makes it the active scene and views it for the GM, and starts a canvas draw.
    // Calling `view` on top of that is what earns "You cannot switch Scenes until resources finish
    // loading for your current view" - the second switch is refused while the first is still
    // drawing, and the scene is left un-viewed.
    await scene.activate();

    const drawn = async () => {
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        if (canvas?.ready && canvas.scene?.id === scene.id) return true;
        await new Promise((r) => setTimeout(r, 50));
      }
      return false;
    };

    if (!(await drawn())) {
      // Activation did not carry this user to the scene - view it now that the canvas is quiet.
      await scene.view();
      if (!(await drawn())) {
        throw new Error(`Scene "${name}" never became the viewed scene`);
      }
    }
    return scene.uuid;
  }, { name, timeout });
}

/**
 * Put an actor's token on a scene. Returns the token id, which is what a combatant is keyed by.
 */
export async function addToken(
  page: Page, sceneUuid: Uuid, actorUuid: Uuid,
  { disposition = 1, hidden = false }: { disposition?: number; hidden?: boolean } = {},
): Promise<string> {
  const id = await page.evaluate(async ({ sceneUuid, actorUuid, disposition, hidden }) => {
    const scene = await fromUuid(sceneUuid);
    const actor = await fromUuid(actorUuid);
    if (!scene || !actor) return null;
    // Laid out in a grid rather than stacked. Tokens sharing a position are indistinguishable to
    // anything that works through the canvas - a right-click for the HUD reaches whichever happens
    // to be on top, not the one the test meant.
    const placed = scene.tokens.size;
    const [token] = await scene.createEmbeddedDocuments('Token', [{
      name: actor.name,
      actorId: actor.id,
      actorLink: true,
      disposition,
      hidden,
      x: 100 + (placed % 4) * 200,
      y: 100 + Math.floor(placed / 4) * 200,
    }]);
    return token?.id ?? null;
  }, { sceneUuid, actorUuid, disposition, hidden });

  if (!id) throw new Error(`Could not put a token for ${actorUuid} on ${sceneUuid}`);
  return id;
}

/**
 * Select a token on the canvas.
 */
export async function controlToken(page: Page, sceneUuid: Uuid, tokenId: string): Promise<void> {
  const problem = await page.evaluate(async ({ sceneUuid, tokenId }) => {
    const scene = await fromUuid(sceneUuid);
    if (!scene) return `no scene at ${sceneUuid}`;
    if (scene.id !== canvas.scene?.id) return 'that scene is not the one being viewed';
    const token = canvas.tokens.get(tokenId);
    if (!token) return `no token ${tokenId} on the canvas`;
    token.control({ releaseOthers: true });
    return null;
  }, { sceneUuid, tokenId });

  if (problem) throw new Error(`Selecting a token: ${problem}`);
}

/**
 * An encounter on a scene, with one combatant per token, activated and started.
 */
export async function createCombat(
  page: Page, sceneUuid: Uuid, tokenIds: string[], { start = true } = {},
): Promise<Uuid> {
  return page.evaluate(async ({ sceneUuid, tokenIds, start }) => {
    const scene = await fromUuid(sceneUuid);
    if (!scene) throw new Error(`No scene at ${sceneUuid}`);

    const CombatClass = getDocumentClass('Combat');
    const combat = await CombatClass.create({ scene: scene.id });
    if (!combat) throw new Error('Combat.create returned nothing');
    await combat.createEmbeddedDocuments('Combatant',
      tokenIds.map((tokenId) => ({ tokenId, sceneId: scene.id })));

    // The tracker renders `ui.combat.viewed`, which is the active encounter and nothing else.
    await combat.activate?.();
    if (start) await combat.startCombat();
    return combat.uuid;
  }, { sceneUuid, tokenIds, start });
}

/** Read the encounter's combatants, flattened to what a test asserts on. */
export async function readCombatants(page: Page, combatUuid: Uuid): Promise<{
  id: string; name: string; tokenId: string;
  initiative: number | null; hidden: boolean; generic: boolean; defeated: boolean;
}[]> {
  return page.evaluate(async (combatUuid) => {
    const combat = await fromUuid(combatUuid);
    if (!combat) throw new Error(`No combat at ${combatUuid}`);
    return combat.combatants.map((c: any) => ({
      id: c.id,
      name: String(c.name ?? ''),
      tokenId: String(c.tokenId ?? ''),
      initiative: c.initiative ?? null,
      // `||`, not `??`: a combatant's own flag is false rather than absent when only its token is
      // hidden, and the tracker treats either as hidden.
      hidden: Boolean(c.hidden || c.token?.hidden),
      // A slot with nobody behind it: `addExtraSlot` makes these to hold a side's place
      // (combat-ffg.js:33), and they are combatants like any other apart from the flag.
      generic: Boolean(c.getFlag?.('starwarsffg', 'fake')),
      defeated: Boolean(c.isDefeated),
    }));
  }, combatUuid);
}

/**
 * Toggle a token in or out of the active encounter from its own HUD.
 */
export async function toggleTokenCombat(page: Page, sceneUuid: Uuid, tokenId: string): Promise<void> {
  const target = await page.evaluate(async ({ sceneUuid, tokenId }) => {
    const scene = await fromUuid(sceneUuid);
    if (scene?.id !== canvas.scene?.id) return { problem: 'that scene is not the one being viewed' };
    const token = canvas.tokens.get(tokenId);
    if (!token) return { problem: `no token ${tokenId} on the canvas` };

    // Select it the way a user would before reaching for the HUD.
    token.control({ releaseOthers: true });

    /*
     * Move the camera so this token is under the middle of the viewport. `animatePan` moves the
     * view, not the tokens - nothing is repositioned and nothing is stacked.
     */
    await canvas.animatePan({ x: token.center.x, y: token.center.y, duration: 0 });
    for (let i = 0; i < 100 && canvas.animations?.size; i++) {
      await new Promise((r) => setTimeout(r, 25));
    }

    // Where the token sits on screen: its centre is in world coordinates, which the stage
    // transform turns into canvas ones, and the canvas element places on the page.
    const centre = canvas.stage.toGlobal({ x: token.center.x, y: token.center.y });
    const canvasRect = canvas.app.view.getBoundingClientRect();
    return { x: canvasRect.left + centre.x, y: canvasRect.top + centre.y };
  }, { sceneUuid, tokenId });

  if ('problem' in target) throw new Error(`Toggling token ${tokenId}: ${target.problem}`);

  // `toggleCombat` in v13, `combat` before it - both accepted rather than pinning to a version.
  const control = page.locator(
    '#token-hud [data-action="toggleCombat"], #token-hud [data-action="combat"], #token-hud .control-icon.combat',
  ).first();

  // longer wait time for CI, which has no GPU
  const appear = process.env.CI ? 8000 : 2000;
  let opened = false;
  for (let attempt = 0; attempt < 3 && !opened; attempt++) {
    await page.mouse.click(target.x, target.y, { button: 'right' });
    opened = await control.waitFor({ state: 'visible', timeout: appear })
      .then(() => true).catch(() => false);
  }

  if (!opened) {
    const offered = await page.evaluate(() =>
      [...document.querySelectorAll('#token-hud [data-action]')]
        .map((el: any) => el.dataset.action).join(', ') || 'nothing');
    throw new Error(
      `Toggling token ${tokenId}: its HUD offered no combat control. It offers: ${offered}`,
    );
  }

  await control.click();

  // Toggling out deletes a Combatant, which the system's hook cancels and re-does in the
  // background, so the roster is still settling when the click returns. See `removeCombatant`.
  await page.evaluate(async (timeout) => {
    const deadline = Date.now() + timeout;
    let previous = -1;
    for (;;) {
      const size = game.combat?.combatants.size ?? -1;
      if (size === previous || Date.now() > deadline) return;
      previous = size;
      await new Promise((r) => setTimeout(r, 50));
    }
  }, 10_000);
}

/** Put another token into an encounter already under way. Returns the combatant's id. */
export async function addCombatant(page: Page, combatUuid: Uuid, tokenId: string): Promise<string> {
  const id = await page.evaluate(async ({ combatUuid, tokenId }) => {
    const combat = await fromUuid(combatUuid);
    if (!combat) throw new Error(`No combat at ${combatUuid}`);
    const [combatant] = await combat.createEmbeddedDocuments('Combatant',
      [{ tokenId, sceneId: combat.scene?.id }]);
    return combatant?.id ?? null;
  }, { combatUuid, tokenId });

  if (!id) throw new Error(`Could not add token ${tokenId} to ${combatUuid}`);
  return id;
}

/**
 * Take a combatant out of an encounter.
 */
export async function removeCombatant(
  page: Page, combatUuid: Uuid, combatantId: string,
  { settle = true, timeout = 10_000 }: { settle?: boolean; timeout?: number } = {},
): Promise<void> {
  const problem = await page.evaluate(async ({ combatUuid, combatantId, settle, timeout }) => {
    const combat = await fromUuid(combatUuid);
    if (!combat) return `No combat at ${combatUuid}`;
    const combatant = combat.combatants.get(combatantId);
    if (!combatant) return `no combatant ${combatantId} in this encounter`;

    /*
     * Awaiting the delete proves nothing. The system's `preDeleteCombatant` hook returns false,
     * which cancels this delete, and then does the removal itself - unclaiming, deleting for real,
     * and adding the replacement slot - in a promise nobody holds (combat-ffg.js:1413). So the
     * call returns with the roster untouched and the work still to come.
     *
     * What is waited for instead is the roster settling: the combatant gone, and then the size
     * holding still across two looks, since the replacement slot arrives a moment after.
     */
    await combatant.delete();
    // `removeCombatantAction: prompt` stops to ask before touching anything, so there is nothing
    // to settle until the question is answered.
    if (!settle) return null;

    const deadline = Date.now() + timeout;
    let previous = -1;
    for (;;) {
      const gone = !combat.combatants.get(combatantId);
      const size = combat.combatants.size;
      if (gone && size === previous) return null;
      if (Date.now() > deadline) {
        return gone
          ? 'the roster never stopped changing after the removal'
          : 'the combatant was still in the encounter';
      }
      previous = gone ? size : -1;
      await new Promise((r) => setTimeout(r, 50));
    }
  }, { combatUuid, combatantId, settle, timeout });

  if (problem) throw new Error(`Removing combatant ${combatantId}: ${problem}`);
}

/**
 * Wait for an encounter's roster to stop changing.
 */
export async function settleRoster(page: Page, combatUuid: Uuid, timeout = 10_000): Promise<void> {
  await page.evaluate(async ({ combatUuid, timeout }) => {
    const combat = await fromUuid(combatUuid);
    if (!combat) throw new Error(`No combat at ${combatUuid}`);
    const deadline = Date.now() + timeout;
    let previous = -1;
    for (;;) {
      const size = combat.combatants.size;
      if (size === previous || Date.now() > deadline) return;
      previous = size;
      await new Promise((r) => setTimeout(r, 50));
    }
  }, { combatUuid, timeout });
}

/**
 * The slots in the order the encounter runs them, as slot ids.
 */
export async function readTurnOrder(page: Page, combatUuid: Uuid): Promise<string[]> {
  return page.evaluate(async (combatUuid) => {
    const combat = await fromUuid(combatUuid);
    if (!combat) throw new Error(`No combat at ${combatUuid}`);
    return combat.turns.map((turn: any) => turn.id);
  }, combatUuid);
}

/**
 * Which tokens are showing a turn marker.
 */
export async function readTurnMarkers(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    canvas.tokens.placeables
      .filter((token: any) => Boolean(token.turnMarker))
      .map((token: any) => token.id));
}

/**
 * The flavour line of the most recent chat message.
 */
export async function readLastChatFlavor(page: Page): Promise<string> {
  return page.evaluate(() => {
    const message = game.messages.contents.at(-1);
    return String(message?.flavor ?? '');
  });
}

/**
 * Roll a weapon the way its owner does, and answer the dialog that opens.
 */
export async function rollWeapon(
  page: Page, actorUuid: Uuid, itemUuid: Uuid,
  { faces = {} as Record<string, number>, add = {} as Record<string, number> } = {},
): Promise<void> {
  const problem = await page.evaluate(async ({ actorUuid, itemUuid, faces, add, sides }) => {
    const actor = await fromUuid(actorUuid);
    const item = await fromUuid(itemUuid);
    if (!actor || !item) return 'the actor or the weapon is gone';

    const before = game.messages.contents.length;

    // By die rather than in sequence: the pool is built from the actor's skill and the item's
    // modifiers, so a test would have to know how many dice of each kind it was about to roll.
    const patched: [any, any][] = [];
    for (const [type, face] of Object.entries(faces)) {
      const denomination = sides[type]?.denomination;
      const Die = game.ffg.diceterms.find((term: any) => term.DENOMINATION === denomination);
      if (!Die) return `no die called "${type}"`;
      patched.push([Die, Die.prototype.mapRandomFace]);
      Die.prototype.mapRandomFace = () => face;
    }

    try {
      // not awaited: it resolves once the dialog is up, and the roll happens when it is answered
      game.ffg.DiceHelpers.rollItem(item.id, actor.id);

      const dialog = await (async () => {
        for (let i = 0; i < 200; i++) {
          const found = (Object.values(ui.windows ?? {}) as any[])
            .find((app) => app?.constructor?.name === 'RollBuilderFFG');
          // `element` is a jQuery object that is empty until the dialog renders, so [0] is
          // undefined for a moment and the wrapper itself is no use to ask for a button.
          const root = found?.element?.[0] ?? found?.element;
          if (root?.querySelector?.('.btn')) return root;
          await new Promise((r) => setTimeout(r, 25));
        }
        return null;
      })();
      if (!dialog) return 'the roll dialog never opened';

      // A die is added by clicking the block around its count, which is what a player does; the
      // input itself is a button and carries no handler of its own (dice/roll-builder.js:325).
      for (const [type, times] of Object.entries(add)) {
        const block = [...dialog.querySelectorAll('.pool-container')]
          .find((el: any) => el.querySelector(`input[name="${type}"]`));
        if (!block) {
          const offered = [...dialog.querySelectorAll('.pool-value input')]
            .map((el: any) => el.name).join(', ');
          return `the dialog has no ${type} dice to add. It offers: ${offered || 'none'}`;
        }
        for (let i = 0; i < (times as number); i++) block.click();
      }

      dialog.querySelector('.btn').click();

      for (let i = 0; i < 200; i++) {
        if (game.messages.contents.length > before) return null;
        await new Promise((r) => setTimeout(r, 25));
      }
      return 'the roll was made but no message reached the chat log';
    } finally {
      for (const [Die, original] of patched) Die.prototype.mapRandomFace = original;
    }
  }, { actorUuid, itemUuid, faces, add, sides: DICE });

  if (problem) throw new Error(`Rolling ${itemUuid}: ${problem}`);
}

/**
 * Send an owned item to chat, the way the sheet's context menu does.
 */
export async function sendItemToChat(page: Page, actorUuid: Uuid, itemUuid: Uuid): Promise<void> {
  const problem = await page.evaluate(async ({ actorUuid, itemUuid }) => {
    const actor = await fromUuid(actorUuid);
    const item = await fromUuid(itemUuid);
    if (!actor || !item) return 'the actor or the item is gone';

    const before = game.messages.contents.length;
    await actor.sheet._itemDetailsToChat(item.id);

    for (let i = 0; i < 200; i++) {
      if (game.messages.contents.length > before) return null;
      await new Promise((r) => setTimeout(r, 25));
    }
    return 'nothing reached the chat log';
  }, { actorUuid, itemUuid });

  if (problem) throw new Error(`Sending ${itemUuid} to chat: ${problem}`);
}

/**
 * Who the last chat message is attributed to.
 *
 * The actor comes back as a uuid rather than the bare id the speaker holds, so a test can compare
 * it with the actor it built.
 */
export async function readLastChatSpeaker(page: Page): Promise<{ alias: string; actor: Uuid | null }> {
  return page.evaluate(() => {
    const speaker = game.messages.contents.at(-1)?.speaker ?? {};
    return {
      alias: String(speaker.alias ?? ''),
      actor: game.actors.get(speaker.actor)?.uuid ?? null,
    };
  });
}

/** How many messages are in the chat log, for tests about how many a thing posts. */
export async function countChatMessages(page: Page): Promise<number> {
  return page.evaluate(() => game.messages.contents.length);
}

/** The last chat message's rendered content, for tests about what a card says. */
export async function readLastChatCard(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const message = game.messages.contents.at(-1);
    if (!message) return '';
    const html = await message.renderHTML?.() ?? null;
    return String(html?.innerHTML ?? message.content ?? '');
  });
}

/**
 * The dice the last roll was actually made with, counted by kind.
 */
export async function readLastRollDice(page: Page): Promise<Record<string, number>> {
  return page.evaluate(async ({ sides }) => {
    const message = game.messages.contents.at(-1);
    const roll = message?.rolls?.[0];
    const counted: Record<string, number> = {};
    for (const type of Object.keys(sides)) counted[type] = 0;
    for (const term of roll?.terms ?? []) {
      const entry = Object.entries(sides).find(
        ([, die]: [string, any]) => die.denomination === (term as any)?.constructor?.DENOMINATION);
      if (entry) counted[entry[0]] += Number((term as any).number) || 0;
    }
    return counted;
  }, { sides: DICE });
}

/**
 * What the last chat card says the damage is.
 */
export async function readCardDamage(page: Page): Promise<string | null> {
  const content = await readLastChatCard(page);
  return content.match(/class="damage-value"[^>]*value="([^"]*)"/)?.[1] ?? null;
}

/**
 * The headline numbers on the last chat card, in the order the card prints them.
 */
export async function readCardStats(page: Page): Promise<{ title: string; value: string }[]> {
  const content = await readLastChatCard(page);
  return page.evaluate((content) => {
    const holder = document.createElement('div');
    holder.innerHTML = content;
    return [...holder.querySelectorAll('.basic-stats .stat')].map((stat) => ({
      title: String(stat.getAttribute('title') ?? ''),
      value: String(stat.textContent ?? '').trim(),
    }));
  }, content);
}

/**
 * The headings of the blocks the last chat card drew, such as descriptors or attachments.
 */
export async function readCardSections(page: Page): Promise<string[]> {
  const content = await readLastChatCard(page);
  return page.evaluate((content) => {
    const holder = document.createElement('div');
    holder.innerHTML = content;
    return [...holder.querySelectorAll('.properties .tag b')]
      .map((label) => String(label.textContent ?? '').trim());
  }, content);
}

/**
 * The names on the last chat card's pills of one kind.
 */
async function readCardPills(page: Page, kind: string): Promise<{ name: string; ranks: string }[]> {
  const content = await readLastChatCard(page);
  return page.evaluate(({ content, kind }) => {
    const holder = document.createElement('div');
    holder.innerHTML = content;
    return [...holder.querySelectorAll(`[data-item-type="${kind}"][data-item-embed-name]`)]
      .map((pill) => ({
        name: String(pill.getAttribute('data-item-embed-name') ?? ''),
        ranks: String(pill.getAttribute('data-item-ranks') ?? ''),
      }));
  }, { content, kind });
}

/** The item qualities named on the last chat card. */
export async function readCardQualities(page: Page): Promise<string[]> {
  return (await readCardPills(page, 'itemmodifier')).map((pill) => pill.name);
}

/** The attachments named on the last chat card. */
export async function readCardAttachments(page: Page): Promise<string[]> {
  return (await readCardPills(page, 'itemattachment')).map((pill) => pill.name);
}

/**
 * How many ranks of each quality the last card credits the item with.
 *
 * The pill carries a total rather than a rank: the sheet adds up every copy of a quality by name
 * before the card is built (items/item-sheet-ffg.js:470).
 */
export async function readCardQualityRanks(page: Page): Promise<Record<string, string>> {
  const pills = await readCardPills(page, 'itemmodifier');
  return Object.fromEntries(pills.map((pill) => [pill.name, pill.ranks]));
}

/**
 * An actor's items, once they have stopped arriving.
 */
export async function settledOwnedItems(
  page: Page, actorUuid: Uuid, { quiet = 400, timeout = 5000 } = {},
): Promise<{ id: string; name: string; type: string; uuid: Uuid }[]> {
  const settled = await page.evaluate(async ({ actorUuid, quiet, timeout }) => {
    const actor = await fromUuid(actorUuid);
    if (!actor) throw new Error(`No actor at ${actorUuid}`);

    const step = 50;
    const deadline = Date.now() + timeout;
    let held = actor.items.size;
    let still = 0;

    while (Date.now() < deadline && still < quiet) {
      await new Promise((r) => setTimeout(r, step));
      if (actor.items.size === held) still += step;
      else {
        held = actor.items.size;
        still = 0;
      }
    }

    return actor.items.map((item: any) => ({
      id: item.id,
      name: String(item.name ?? ''),
      type: String(item.type ?? ''),
      uuid: item.uuid,
    }));
  }, { actorUuid, quiet, timeout });

  return settled;
}

/** Read several paths off one document, for comparing two documents field by field. */
export async function readMany(
  page: Page, uuid: Uuid, paths: string[],
): Promise<Record<string, unknown>> {
  return page.evaluate(async ({ uuid, paths }) => {
    const doc = await fromUuid(uuid);
    if (!doc) throw new Error(`No document at ${uuid}`);
    return Object.fromEntries(
      paths.map((path) => [path, foundry.utils.getProperty(doc, path) ?? null]));
  }, { uuid, paths });
}

/** Every actor in the world, for telling what a test or a tool left behind. */
export async function readActors(page: Page): Promise<{
  id: string; name: string; type: string; uuid: Uuid;
}[]> {
  return page.evaluate(() => game.actors.map((actor: any) => ({
    id: actor.id,
    name: String(actor.name ?? ''),
    type: String(actor.type ?? ''),
    uuid: actor.uuid,
  })));
}

/** The items on an actor, flattened to what a test needs to find one. */
export async function readOwnedItems(page: Page, actorUuid: Uuid): Promise<{
  id: string; name: string; type: string; uuid: Uuid;
}[]> {
  return page.evaluate(async (actorUuid) => {
    const actor = await fromUuid(actorUuid);
    if (!actor) throw new Error(`No actor at ${actorUuid}`);
    return actor.items.map((item: any) => ({
      id: item.id,
      name: String(item.name ?? ''),
      type: String(item.type ?? ''),
      uuid: item.uuid,
    }));
  }, actorUuid);
}

/* -------------------------------------------- */
/*  Edit mode                                   */
/* -------------------------------------------- */

/** Whether the actor is in edit mode. */
export async function readEditMode(page: Page, actorUuid: Uuid): Promise<boolean> {
  return page.evaluate(async (actorUuid) => {
    const actor = await fromUuid(actorUuid);
    if (!actor) throw new Error(`No actor at ${actorUuid}`);
    return Boolean(actor.getFlag('starwarsffg', 'config.enableEditMode'));
  }, actorUuid);
}

/**
 * Turn edit mode on or off through the sheet's own options.
 */
export async function setEditMode(page: Page, actorUuid: Uuid, enabled: boolean): Promise<void> {
  await openSheet(page, actorUuid);

  const problem = await page.evaluate(async (actorUuid) => {
    const actor = await fromUuid(actorUuid);
    const root = actor?.sheet?.element?.[0] ?? actor?.sheet?.element;
    const wrench = root?.querySelector?.('.ffg-sheet-options');
    if (!wrench) return 'the sheet has no options control';
    wrench.click();
    return null;
  }, actorUuid);

  if (problem) throw new Error(`Setting edit mode on ${actorUuid}: ${problem}`);

  await waitForDialog(page);

  const control = '[name="config.enableEditMode"]';
  const there = await page.waitForSelector(control, { timeout: 5000 })
    .then(() => true).catch(() => false);

  if (!there) {
    const offered = await page.evaluate(async (actorUuid) => {
      const actor = await fromUuid(actorUuid);
      const inputs = [...document.querySelectorAll('[name^="config."]')]
        .map((el: any) => el.name).join(', ') || 'none';
      const registered = Object.keys(actor?.sheet?.sheetoptions?.options ?? {}).join(', ') || 'none';
      return `the dialog offers: ${inputs}; the sheet registered: ${registered}`;
    }, actorUuid);

    await closeDialogs(page);
    throw new Error(`Setting edit mode on ${actorUuid}: no edit mode control. ${offered}`);
  }

  await page.evaluate(({ control, enabled }) => {
    const box = document.querySelector(control) as HTMLInputElement | null;
    if (box) box.checked = enabled;
  }, { control, enabled });

  await answerDialog(page, 'one');
}

/**
 * Grant XP the way the group manager does, dialog and all.
 */
export async function grantXp(
  page: Page, actorUuid: Uuid, amount: number, note = 'qa grant',
): Promise<void> {
  const problem = await page.evaluate(async (actorUuid) => {
    const actor = await fromUuid(actorUuid);
    if (!actor) return `No actor at ${actorUuid}`;

    const load = (path: string) => import(/* @vite-ignore */ `/systems/starwarsffg/modules/${path}`);
    const module = await load('groupmanager-ffg.js');
    if (!module?.GroupManager) return 'the group manager could not be loaded';

    // Not awaited: the dialog is rendered and the work happens in its callback.
    void new module.GroupManager()._grantXP(actor);
    return null;
  }, actorUuid);

  if (problem) throw new Error(`Granting XP to ${actorUuid}: ${problem}`);

  await waitForDialog(page);

  const missing = await page.evaluate(({ amount, note }) => {
    const box = document.querySelector('input[name="amount"]') as HTMLInputElement | null;
    const reason = document.querySelector('input[name="note"]') as HTMLInputElement | null;
    if (!box || !reason) return 'the grant dialog has no amount to fill in';
    box.value = String(amount);
    reason.value = note;
    return null;
  }, { amount, note });

  if (missing) {
    await closeDialogs(page);
    throw new Error(`Granting XP to ${actorUuid}: ${missing}`);
  }

  await answerDialog(page, 'one');
}

/**
 * Set a characteristic, the way editing the field on the sheet does.
 */
export async function setCharacteristic(
  page: Page, actorUuid: Uuid, characteristic: string, value: number,
): Promise<void> {
  const problem = await page.evaluate(async ({ actorUuid, characteristic, value }) => {
    const actor = await fromUuid(actorUuid);
    if (!actor) return `No actor at ${actorUuid}`;
    if (!actor.system?.characteristics?.[characteristic]) {
      return `no characteristic called "${characteristic}"`;
    }
    await actor.update({ [`system.characteristics.${characteristic}.value`]: value });
    return null;
  }, { actorUuid, characteristic, value });

  if (problem) throw new Error(`Setting ${characteristic} on ${actorUuid}: ${problem}`);
}

/**
 * One item's own Active Effects, with what each of them changes.
 */
export async function readItemEffects(page: Page, uuid: Uuid): Promise<{
  name: string; disabled: boolean;
  changes: { key: string; mode: number; value: string }[];
}[]> {
  return page.evaluate(async (uuid) => {
    const item = await fromUuid(uuid);
    if (!item) throw new Error(`No item at ${uuid}`);
    return [...item.effects].map((effect: any) => ({
      name: String(effect.name ?? ''),
      disabled: Boolean(effect.disabled),
      changes: (effect.changes ?? []).map((change: any) => ({
        key: String(change.key ?? ''),
        mode: Number(change.mode ?? 0),
        value: String(change.value ?? ''),
      })),
    }));
  }, uuid);
}

/**
 * Every Active Effect on an actor and on its items, with whether it is switched off.
 */
export async function readEffects(page: Page, actorUuid: Uuid): Promise<{
  id: string; name: string; disabled: boolean; on: string;
}[]> {
  return page.evaluate(async (actorUuid) => {
    const actor = await fromUuid(actorUuid);
    if (!actor) throw new Error(`No actor at ${actorUuid}`);

    const read = (effect: any, on: string) => ({
      id: effect.id,
      name: String(effect.name ?? ''),
      disabled: Boolean(effect.disabled),
      on,
    });

    // Spread first: these are Foundry Collections, which carry `map` and `filter` but not
    // `flatMap`.
    return [
      ...[...actor.effects].map((effect: any) => read(effect, 'actor')),
      ...[...actor.items].flatMap((item: any) =>
        [...item.effects].map((effect: any) => read(effect, item.name))),
    ];
  }, actorUuid);
}

/** Whether an encounter is still there. Ending one deletes it. */
export async function combatExists(page: Page, combatUuid: Uuid): Promise<boolean> {
  return page.evaluate(
    async (uuid) => Boolean(await fromUuid(uuid).catch(() => null)), combatUuid);
}

/**
 * Answer a yes/no confirmation, whichever generation of dialog raised it.
 */
export async function confirmDialog(page: Page, timeout = 5000): Promise<boolean> {
  const button = page.locator(
    'dialog button[data-action="yes"], .dialog button[data-button="yes"], dialog button.yes',
  ).first();

  try {
    await button.waitFor({ state: 'visible', timeout });
  } catch {
    return false;
  }
  await button.click();
  return true;
}

/** The slot whose turn it is, as a slot id, or null before the encounter has one. */
export async function readCurrentSlot(page: Page, combatUuid: Uuid): Promise<string | null> {
  return page.evaluate(async (combatUuid) => {
    const combat = await fromUuid(combatUuid);
    if (!combat) throw new Error(`No combat at ${combatUuid}`);
    return combat.turns[combat.turn]?.id ?? null;
  }, combatUuid);
}

/**
 * Make a given slot the current one, by its position in the turn order.
 */
export async function setTurn(page: Page, combatUuid: Uuid, index: number): Promise<void> {
  const problem = await page.evaluate(async ({ combatUuid, index }) => {
    const combat = await fromUuid(combatUuid);
    if (!combat) return `No combat at ${combatUuid}`;
    if (index >= combat.turns.length) {
      return `there is no turn ${index}; the encounter has ${combat.turns.length}`;
    }
    await combat.update({ turn: index });
    return null;
  }, { combatUuid, index });

  if (problem) throw new Error(`Setting the turn: ${problem}`);
}

/** Mark a combatant defeated, as the tracker's skull does. */
export async function setDefeated(
  page: Page, combatUuid: Uuid, combatantId: string, defeated = true,
): Promise<void> {
  const problem = await page.evaluate(async ({ combatUuid, combatantId, defeated }) => {
    const combat = await fromUuid(combatUuid);
    const combatant = combat?.combatants.get(combatantId);
    if (!combatant) return `no combatant ${combatantId} in this encounter`;
    await combatant.update({ defeated });
    return null;
  }, { combatUuid, combatantId, defeated });

  if (problem) throw new Error(`Marking ${combatantId} defeated: ${problem}`);
}

/** Make an encounter the active one, which is the one the tracker draws. */
export async function activateCombat(page: Page, combatUuid: Uuid): Promise<void> {
  const problem = await page.evaluate(async (combatUuid) => {
    const combat = await fromUuid(combatUuid);
    if (!combat) return `No combat at ${combatUuid}`;
    await combat.activate();
    return null;
  }, combatUuid);

  if (problem) throw new Error(`Activating ${combatUuid}: ${problem}`);
}

/** Advance the encounter to the next round, and hand back the round it reached. */
export async function nextRound(page: Page, combatUuid: Uuid): Promise<number> {
  return page.evaluate(async (combatUuid) => {
    const combat = await fromUuid(combatUuid);
    if (!combat) throw new Error(`No combat at ${combatUuid}`);
    await combat.nextRound();
    return combat.round;
  }, combatUuid);
}

/**
 * Who has claimed what for a round, as `{ [slotId]: combatantId }`.
 */
export async function readSlotClaims(
  page: Page, combatUuid: Uuid, round?: number,
): Promise<Record<string, string>> {
  return page.evaluate(async ({ combatUuid, round }) => {
    const combat = await fromUuid(combatUuid);
    if (!combat) throw new Error(`No combat at ${combatUuid}`);
    const claims = combat.getFlag('starwarsffg', 'combatClaims') ?? {};
    return claims[round ?? combat.round] ?? {};
  }, { combatUuid, round });
}

/**
 * Give up a claimed slot, as the tracker's "Un-claim Initiative Slot" entry does.
 */
export async function unclaimSlot(page: Page, combatUuid: Uuid, slotId: string): Promise<void> {
  const problem = await page.evaluate(async ({ combatUuid, slotId }) => {
    const combat = await fromUuid(combatUuid);
    if (!combat) return `No combat at ${combatUuid}`;
    if (typeof combat.unclaimSlot !== 'function') return 'this combat has no slots to un-claim';
    await combat.unclaimSlot(combat.round, slotId);
    return null;
  }, { combatUuid, slotId });

  if (problem) throw new Error(`Un-claiming slot ${slotId}: ${problem}`);
}

/**
 * Render the combat tracker.
 */
export async function openCombatTracker(page: Page, timeout = 10_000): Promise<void> {
  const problem = await page.evaluate(async (timeout) => {
    const sidebar = (ui as any).sidebar;

    // Rendering the tracker is not the same as showing it: it is a sidebar tab, and until the
    // sidebar is expanded and switched to it nothing of it is in the DOM to assert on.
    sidebar?.expand?.();
    if (typeof sidebar?.changeTab === 'function') sidebar.changeTab('combat', 'primary');
    else if (typeof sidebar?.activateTab === 'function') sidebar.activateTab('combat');

    await ui.combat.render(true);

    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (document.querySelector('#combat-tracker')) return null;
      await new Promise((r) => setTimeout(r, 25));
    }
    return `the tracker never reached the sidebar (tab is "${sidebar?.tabGroups?.primary ?? 'unknown'}")`;
  }, timeout);

  if (problem) throw new Error(`Opening the combat tracker: ${problem}`);
}

/**
 * Roll initiative and answer the dialog it raises.
 */
export async function rollInitiative(
  page: Page, combatUuid: Uuid,
  { skill = 'Vigilance', ids, npcOnly = false }:
    { skill?: string; ids?: string[]; npcOnly?: boolean } = {},
): Promise<{ offered: string[]; checked: string | null }> {
  /*
   * The pool dialog belongs to CombatFFG, which the system registers whichever kind of slots the
   * tracker is showing (swffg-main.js:348) - so the roll is answered the same way either way.
   */
  const started = await page.evaluate(async ({ combatUuid, ids, npcOnly }) => {
    const combat = await fromUuid(combatUuid);
    if (!combat) return `No combat at ${combatUuid}`;

    const w = window as any;

    /*
     * `rollInitiative` is a `new Promise(async (resolve, reject) => ...)`, so anything thrown
     * inside the executor rejects a promise nobody is holding: the outer promise never settles,
     * no dialog opens, and the only symptom is a wait that expires. The errors are collected here
     * so the failure can name what actually went wrong.
     */
    w.__qaRollErrors = [];
    w.__qaRollErrorSink = (event: any) =>
      w.__qaRollErrors.push(String(event?.reason?.message ?? event?.message ?? event?.reason ?? event));
    window.addEventListener('unhandledrejection', w.__qaRollErrorSink);
    window.addEventListener('error', w.__qaRollErrorSink);

    // `rollNPC` picks the unrolled combatants nobody plays and hands them to the same roll, so it
    // raises the same dialog and is answered the same way.
    w.__qaInitiative = Promise.resolve(npcOnly
      ? combat.rollNPC()
      : combat.rollInitiative(ids ?? combat.combatants.map((c: any) => c.id)))
      .catch((err: any) => { w.__qaInitiativeError = err?.message ?? String(err); });
    return null;
  }, { combatUuid, ids, npcOnly });

  if (started) throw new Error(`Rolling initiative on ${combatUuid}: ${started}`);

  try {
    await waitForDialog(page);
  } catch (err) {
    const swallowed = await collectRollErrors(page);
    throw new Error(
      `Rolling initiative on ${combatUuid}: the pool dialog never opened. ${String(err)}` +
      (swallowed.length ? `\nErrors raised while rolling: ${swallowed.join('; ')}` : ''),
    );
  }

  // Waited for rather than queried: `waitForDialog` answers as soon as the application exists,
  // and a dialog whose pools have not been drawn yet reads exactly like one that has none.
  await page.waitForSelector('input[name="skill"]', { timeout: 5000 }).catch(() => {});

  // The pools on offer are worth having back: which ones the dialog built is the only visible
  // result of an actor's `useForInitiative` flags.
  const { offered, checked, problem } = await page.evaluate((skill) => {
    const radios = [...document.querySelectorAll('input[name="skill"]')] as HTMLInputElement[];
    const offered = radios.map((radio) => radio.value);
    // Read before anything is selected: which pool the dialog starts on is what `initiativeRule`
    // decides, and choosing one here would overwrite the answer.
    const checked = radios.find((radio) => radio.checked)?.value ?? null;

    const wanted = radios.find((radio) => radio.value === skill);
    if (!wanted) {
      return { offered, checked, problem: `no "${skill}" pool. It offers: ${offered.join(', ') || 'none'}` };
    }
    wanted.checked = true;
    return { offered, checked, problem: null };
  }, skill);

  if (problem) {
    await closeDialogs(page);
    throw new Error(`Rolling initiative on ${combatUuid}: the dialog has ${problem}`);
  }

  await answerDialog(page, 'one');

  const failure = await page.evaluate(async () => {
    const w = window as any;
    await w.__qaInitiative;
    const error = w.__qaInitiativeError ?? null;
    delete w.__qaInitiative;
    delete w.__qaInitiativeError;
    return error;
  });

  const swallowed = await collectRollErrors(page);
  if (failure || swallowed.length) {
    throw new Error(
      `Rolling initiative on ${combatUuid}: ${failure ?? 'the roll reported no error'}` +
      (swallowed.length ? `\nErrors raised while rolling: ${swallowed.join('; ')}` : ''),
    );
  }

  return { offered, checked };
}

/** Take back whatever the roll threw where nothing was listening, and stop listening. */
async function collectRollErrors(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const w = window as any;
    const errors: string[] = w.__qaRollErrors ?? [];
    if (w.__qaRollErrorSink) {
      window.removeEventListener('unhandledrejection', w.__qaRollErrorSink);
      window.removeEventListener('error', w.__qaRollErrorSink);
    }
    delete w.__qaRollErrors;
    delete w.__qaRollErrorSink;
    return errors;
  }).catch(() => []);
}

/**
 * The world's skill themes with one of them copied under a new id.
 *
 * Handed back rather than written, so the test can put it in place through `world.setSetting` and
 * have it restored afterwards. Copying the standard list is what a GM does when they want to
 * rename a skill or two, and it is the shape #2282 is about.
 */
export async function skillThemeCopy(page: Page, from: string, id: string): Promise<unknown[]> {
  const result = await page.evaluate(({ from, id }) => {
    const themes = game.settings.get('starwarsffg', 'arraySkillList') ?? [];
    const original = themes.find((theme: any) => theme.id === from);
    if (!original) {
      return { error: `no skill theme "${from}". The world has: ${themes.map((t: any) => t.id).join(', ')}` };
    }
    return { themes: [...themes, { ...foundry.utils.deepClone(original), id }] };
  }, { from, id });

  if ('error' in result) throw new Error(`Copying the skill theme: ${result.error}`);
  return result.themes as unknown[];
}

/**
 * Ask the system to build a crew roll, and say whether it would.
 */
export async function buildCrewRoll(
  page: Page, vehicleUuid: Uuid, crewUuid: Uuid, role: string,
): Promise<boolean> {
  const result = await page.evaluate(async ({ vehicleUuid, crewId, role }) => {
    const vehicle = await fromUuid(vehicleUuid);
    if (!vehicle) return { error: `No vehicle at ${vehicleUuid}` };

    const load = (p: string) => import(/* @vite-ignore */ `/systems/starwarsffg/modules/${p}`);
    const { build_crew_roll } = await load('helpers/crew.js');

    try {
      return { drawn: build_crew_roll(vehicle.id, crewId, role) !== false };
    } catch (err: any) {
      return { error: `it threw rather than declining: ${err?.message ?? err}` };
    }
  }, { vehicleUuid, crewId: String(crewUuid).split('.').pop(), role });

  if ('error' in result) throw new Error(`Building a ${role} roll on ${vehicleUuid}: ${result.error}`);
  return result.drawn as boolean;
}

/** The crew roles the world offers, as the settings list them. */
export async function readCrewRoles(page: Page): Promise<{
  name: string; skill: string; weapons: boolean; handling: boolean;
}[]> {
  return page.evaluate(() =>
    (game.settings.get('starwarsffg', 'arrayCrewRoles') ?? []).map((role: any) => ({
      name: String(role.role_name ?? ''),
      skill: String(role.role_skill ?? ''),
      weapons: Boolean(role.use_weapons),
      handling: Boolean(role.use_handling),
    })));
}

/** Who is aboard a vehicle, and in which role. */
export async function readCrew(page: Page, vehicleUuid: Uuid): Promise<{
  actorId: string; actorName: string; role: string;
}[]> {
  return page.evaluate(async (vehicleUuid) => {
    const vehicle = await fromUuid(vehicleUuid);
    if (!vehicle) throw new Error(`No vehicle at ${vehicleUuid}`);
    return (vehicle.getFlag('starwarsffg', 'crew') ?? []).map((member: any) => ({
      actorId: String(member.actor_id ?? ''),
      actorName: String(member.actor_name ?? ''),
      role: String(member.role ?? ''),
    }));
  }, vehicleUuid);
}

/**
 * Put an actor aboard a vehicle in the given roles, replacing whatever roles it held before.
 */
export async function setCrewRoles(
  page: Page, vehicleUuid: Uuid, crewUuid: Uuid, roles: string[],
): Promise<void> {
  const problem = await page.evaluate(async ({ vehicleUuid, crewUuid, roles }) => {
    const vehicle = await fromUuid(vehicleUuid);
    const crew = await fromUuid(crewUuid);
    if (!vehicle || !crew) return 'the vehicle or the crew member is gone';
    if (vehicle.type !== 'vehicle') return `${vehicle.name} is a ${vehicle.type}, not a vehicle`;

    const load = (p: string) => import(/* @vite-ignore */ `/systems/starwarsffg/modules/${p}`);
    const { updateRoles } = await load('helpers/crew.js');

    await updateRoles(vehicle, crew.id, [...roles]);

    for (let i = 0; i < 200; i++) {
      const aboard = (vehicle.getFlag('starwarsffg', 'crew') ?? [])
        .filter((member: any) => member.actor_id === crew.id)
        .map((member: any) => member.role);
      if (roles.every((role) => aboard.includes(role)) && aboard.length === roles.length) return null;
      await new Promise((r) => setTimeout(r, 25));
    }
    return `the roles were set but never reached the vehicle`;
  }, { vehicleUuid, crewUuid, roles });

  if (problem) throw new Error(`Crewing ${vehicleUuid}: ${problem}`);
}

/**
 * Take one role off a crew member, leaving any others they hold.
 */
export async function removeCrewRole(
  page: Page, vehicleUuid: Uuid, crewUuid: Uuid, role: string,
): Promise<void> {
  const problem = await page.evaluate(async ({ vehicleUuid, crewUuid, role }) => {
    const vehicle = await fromUuid(vehicleUuid);
    const crew = await fromUuid(crewUuid);
    if (!vehicle || !crew) return 'the vehicle or the crew member is gone';

    const load = (p: string) => import(/* @vite-ignore */ `/systems/starwarsffg/modules/${p}`);
    const { deregister_crew } = await load('helpers/crew.js');

    const held = (vehicle.getFlag('starwarsffg', 'crew') ?? [])
      .filter((member: any) => member.actor_id === crew.id).map((member: any) => member.role);
    if (!held.includes(role)) {
      return `${crew.name} is not the ${role}. They are: ${held.join(', ') || 'not aboard at all'}`;
    }

    deregister_crew(vehicle, crew.id, role);

    for (let i = 0; i < 200; i++) {
      const aboard = (vehicle.getFlag('starwarsffg', 'crew') ?? [])
        .filter((member: any) => member.actor_id === crew.id).map((member: any) => member.role);
      if (!aboard.includes(role)) return null;
      await new Promise((r) => setTimeout(r, 25));
    }
    return 'the role was removed but the vehicle still lists it';
  }, { vehicleUuid, crewUuid, role });

  if (problem) throw new Error(`Standing down the ${role} of ${vehicleUuid}: ${problem}`);
}

/**
 * Move a crew member from one role to another.
 */
export async function changeCrewRole(
  page: Page, vehicleUuid: Uuid, crewUuid: Uuid, from: string, to: string,
): Promise<void> {
  const problem = await page.evaluate(async ({ vehicleUuid, crewUuid, from, to }) => {
    const vehicle = await fromUuid(vehicleUuid);
    const crew = await fromUuid(crewUuid);
    if (!vehicle || !crew) return 'the vehicle or the crew member is gone';

    const load = (p: string) => import(/* @vite-ignore */ `/systems/starwarsffg/modules/${p}`);
    const { change_role } = await load('helpers/crew.js');

    await change_role(vehicle, crew.id, from, to);

    for (let i = 0; i < 200; i++) {
      const aboard = (vehicle.getFlag('starwarsffg', 'crew') ?? [])
        .filter((member: any) => member.actor_id === crew.id).map((member: any) => member.role);
      if (aboard.includes(to) && !aboard.includes(from)) return null;
      await new Promise((r) => setTimeout(r, 25));
    }
    return `the change was made but the vehicle still reads ${from}`;
  }, { vehicleUuid, crewUuid, from, to });

  if (problem) throw new Error(`Reassigning the crew of ${vehicleUuid}: ${problem}`);
}

/**
 * Mark or unmark an actor with one of the configured statuses.
 *
 * `toggleStatusEffect` is what the token HUD calls when a GM clicks one of the little icons, so
 * the effect that lands is the one a table would see.
 */
export async function toggleStatus(
  page: Page, actorUuid: Uuid, statusId: string, active?: boolean,
): Promise<void> {
  const problem = await page.evaluate(async ({ actorUuid, statusId, active }) => {
    const actor = await fromUuid(actorUuid);
    if (!actor) return `No actor at ${actorUuid}`;

    const known = (CONFIG.statusEffects ?? []).map((status: any) => status.id);
    if (!known.includes(statusId)) {
      return `no status called "${statusId}". The world offers: ${known.join(', ')}`;
    }

    await actor.toggleStatusEffect(statusId, active === undefined ? {} : { active });
    return null;
  }, { actorUuid, statusId, active });

  if (problem) throw new Error(`Marking ${actorUuid} with ${statusId}: ${problem}`);
}

/**
 * The statuses a token can be marked with, as the system configured them.
 */
export async function readStatusEffects(page: Page): Promise<{
  id: string; name: string; changes: number; duration: string | null;
}[]> {
  return page.evaluate(() =>
    (CONFIG.statusEffects ?? []).map((status: any) => ({
      id: String(status.id ?? ''),
      name: game.i18n.localize(status.name ?? ''),
      changes: (status.changes ?? []).length,
      duration: status.system?.duration ?? null,
    })));
}

/** The system's dice, by the name a test uses for them. */
const DICE: Record<string, { denomination: string; faces: number }> = {
  ability: { denomination: 'a', faces: 8 },
  proficiency: { denomination: 'p', faces: 12 },
  boost: { denomination: 'b', faces: 6 },
  setback: { denomination: 's', faces: 6 },
  difficulty: { denomination: 'i', faces: 8 },
  challenge: { denomination: 'c', faces: 12 },
  force: { denomination: 'f', faces: 12 },
};

/**
 * Roll named faces of the system's dice, and report what the roll made of them.
 *
 * Rolls are otherwise untestable: a test that rolls two ability dice and expects a success is
 * asserting on luck. Each die is asked for a specific face by standing in for the PRNG - Foundry
 * picks a face with `Math.ceil((1 - randomUniform()) * faces)` - and the faces themselves are
 * named in CONFIG.FFG.<DIE>_RESULTS, so `{ type: 'ability', face: 4 }` is the two-success side.
 *
 * One die per term, in the order given, so the queue of faces lines up with the dice that draw
 * from it. What comes back is `roll.ffg`: the symbols after the system has cancelled them off
 * against each other (dice/roll.js:187).
 */
export async function rollDice(page: Page, dice: { type: string; face: number }[]): Promise<{
  success: number; failure: number; advantage: number; threat: number;
  triumph: number; despair: number; light: number; dark: number;
}> {
  const unknown = dice.find((die) => !DICE[die.type]);
  if (unknown) {
    throw new Error(`No die called "${unknown.type}". The system rolls: ${Object.keys(DICE).join(', ')}.`);
  }

  const result = await page.evaluate(async ({ dice, sides }) => {
    const expression = dice.map((die: any) => `1d${sides[die.type].denomination}`).join('+');
    // ceil((1 - u) * faces) === face, taking the middle of the band so rounding cannot reach past it
    const queue = dice.map((die: any) => 1 - (die.face - 0.5) / sides[die.type].faces);

    const original = CONFIG.Dice.randomUniform;
    CONFIG.Dice.randomUniform = () => {
      if (!queue.length) throw new Error('the roll asked for more dice than the test named faces for');
      return queue.shift();
    };

    try {
      const roll = await new game.ffg.RollFFG(expression).evaluate();
      if (queue.length) {
        return { error: `${queue.length} of the named faces were never rolled (${expression})` };
      }
      return { ffg: roll.ffg };
    } catch (err: any) {
      return { error: String(err?.message ?? err) };
    } finally {
      CONFIG.Dice.randomUniform = original;
    }
  }, { dice, sides: DICE });

  if ('error' in result) throw new Error(`Rolling ${dice.length} dice: ${result.error}`);
  return result.ffg as any;
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
