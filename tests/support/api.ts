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
    const row = root?.querySelector(
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
    const node = root?.querySelector(`.specialization-talent[id="${nodeKey}"]`);
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
  page: Page, actorUuid: Uuid, itemUuid: Uuid,
): Promise<Uuid> {
  const result = await page.evaluate(async ({ actorUuid, itemUuid }) => {
    const actor = await fromUuid(actorUuid);
    if (!actor) return { error: `No actor at ${actorUuid}` };
    if (actor.getFlag('starwarsffg', 'config.enableEditMode')) {
      return { error: 'the actor is in edit mode, which refuses every drop' };
    }
    const before = new Set(actor.items.map((i: any) => i.id));

    await actor.sheet._onDropItem(
      { preventDefault: () => {}, stopPropagation: () => {}, currentTarget: null, target: null },
      { type: 'Item', uuid: itemUuid },
    );

    // _onDropItemCreate resolves before the item is in the collection in some paths
    for (let i = 0; i < 100; i++) {
      const landed = actor.items.find((item: any) => !before.has(item.id));
      if (landed) return { uuid: landed.uuid };
      await new Promise((r) => setTimeout(r, 25));
    }
    return { error: 'the sheet accepted the drop but no item appeared on the actor' };
  }, { actorUuid, itemUuid });

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
