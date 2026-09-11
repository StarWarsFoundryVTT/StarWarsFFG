import type { Page } from '@playwright/test';
import * as api from './api';
import type { Uuid } from './api';
import { ITEMS, ACTORS, attributeMap, talentMap,
         type ModifierSpec, type AttributeSpec, type TalentSpec,
         type ItemFixture } from '../fixtures/documents';

export type { ModifierSpec, AttributeSpec, TalentSpec };

/**
 * Builds nested content, repeats actions, reloads, and cleans up.
 */

/**
 * How the content was created. Different paths initialize different fields.
 * `import` comes from the seeded world rather than being built per test.
 */
export type Origin = 'sidebar' | 'compendium' | 'in-sheet' | 'import';

export interface BuildSpec {
  /** Fixture key from ACTORS, not a bare document type. */
  actor: string;
  /** Fixture key from ITEMS, not a bare document type. */
  item?: string;
  attachment?: string | AttachmentSpec;
  modifier?: ModifierSpec;
  origin?: Origin;
  /** Armour and weapons only contribute while equipped. Defaults to true when an item is present. */
  equipped?: boolean;
  /** Name prefix, for readability in traces. A unique suffix is always appended. */
  label?: string;
  /** Modifiers on the item itself, as the sheet's modifier rows write them. */
  attributes?: AttributeSpec[];
  /** The attachment's Base Mods tab - rows on the attachment itself. D2. */
  baseMods?: AttributeSpec[];
  /** Talents in a specialization, or upgrades in a force power / signature ability. */
  talents?: TalentSpec[];
  /** Per-test tweaks merged over the item fixture's system data. */
  itemOverrides?: Record<string, unknown>;
  /** Per-test tweaks merged over the actor fixture's system data. */
  actorOverrides?: Record<string, unknown>;
}

/**
 * A Modification: the same itemmodifier document as a quality on an item, seen from an attachment.
 */
export interface ModificationSpec extends Omit<ModifierSpec, 'active'> {
  /** The editor's "Installed?" box. Stored as `system.active`. Defaults to the fixture's false. */
  installed?: boolean;
}

/**
 * An attachment to build and drop onto an item after the fact.
 */
export interface AttachmentSpec {
  /** Name prefix, for readability in traces. A unique suffix is always appended. */
  name?: string;
  /** What the drop handler will accept it onto (`system.type` on the attachment). */
  type?: string;
  /** Hardpoint cost. The carrier's budget is set with `itemOverrides.hardpoints`. */
  hardpoints?: number;
  /** The attachment's Base Mods tab - rows on the attachment itself. D2. */
  baseMods?: AttributeSpec[];
  /** Its Modifications tab - itemmodifier documents nested inside it. D3. */
  modifications?: ModificationSpec[];
}

export interface Ctx {
  actor: Uuid;
  item?: Uuid;
  /** Names are kept because the drag path has to find the documents in the UI by name. */
  actorName: string;
  itemName?: string;
  /** Index of the attachment within `item.system.itemattachment`, since it has no id. */
  attachmentIndex?: number;
  /** The world item the owned copy was made from. Kept for tests that re-place the same source. */
  source?: Uuid;
  spec: BuildSpec;
}

/**
 * Merge overrides into fixture data without losing sibling keys.
 */
function deepMerge(
  base: Record<string, unknown>, overrides: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(overrides)) {
    const existing = out[k];
    const bothPlainObjects =
      v && typeof v === 'object' && !Array.isArray(v) &&
      existing && typeof existing === 'object' && !Array.isArray(existing);
    out[k] = bothPlainObjects
      ? deepMerge(existing as Record<string, unknown>, v as Record<string, unknown>)
      : v;
  }
  return out;
}

/**
 * Types whose inherent Active Effect is created holding placeholder zeros.
 */
const PLACEHOLDER_INHERENT = new Set(['gear', 'weapon', 'armour', 'shipattachment']);

/**
 * Types that carry the `equippable` template, and so have an equipped state to set.
 */
const EQUIPPABLE = new Set(['weapon', 'armour', 'shipweapon', 'shipattachment']);

/** Unique per build, so a failed test can't collide with the next one. */
let seq = 0;
const unique = (base: string) => `${base}-${process.pid.toString(36)}-${(seq++).toString(36)}`;

export class World {
  constructor(readonly page: Page) {}

  /** Documents to remove after the test, newest first. */
  private readonly created: Uuid[] = [];
  private readonly packs: string[] = [];
  /** Kept so `applyAgain()` can repeat what `build()` did. */
  private last?: Ctx;

  /**
   * The fields of a ModifierSpec that are stored on the modifier itself rather than as one of its
   * attributes. Left off the payload entirely when unset, so the fixture's own values stand.
   */
  private static modifierSystem(m: ModifierSpec): Record<string, unknown> {
    const system: Record<string, unknown> = {};
    if (m.active !== undefined) system.active = m.active;
    if (m.rank !== undefined) system.rank = m.rank;
    return system;
  }

  /** Register a UUID for teardown. */
  track(uuid: Uuid): Uuid {
    this.created.unshift(uuid);
    return uuid;
  }

  /**
   * Check the world is usable before a test relies on it.
   * Fails fast, rather than letting each assertion time out on its own.
   */
  async assertReady(): Promise<void> {
    const s = await api.status(this.page);
    if (!s.ready) throw new Error('Foundry is not ready.');
    if (s.system !== 'starwarsffg') {
      throw new Error(`Wrong system: expected "starwarsffg", world is running "${s.system}".`);
    }
    if (!s.systemLoaded) {
      throw new Error(
        'The starwarsffg system did not initialise - `game.ffg` is absent.\n' +
        'Usually a module in the system failed to load, which aborts the whole ESM graph while ' +
        'leaving core Foundry healthy. Check the browser console for a resolution error.',
      );
    }
    if (!s.isGM) throw new Error('The test user is not a GM; most fixtures need GM rights.');
  }

  /**
   * Build an actor, an item, and whatever the spec nests inside it, in one call.
   */
  async build(spec: BuildSpec): Promise<Ctx> {
    World.assertKnownKeys(spec, [
      'actor', 'item', 'attachment', 'modifier', 'origin', 'equipped', 'label',
      'attributes', 'baseMods', 'talents', 'itemOverrides', 'actorOverrides',
    ], 'build spec');
    const origin = spec.origin ?? 'sidebar';
    const label = spec.label ?? 'qa';

    const actorFixture = ACTORS[spec.actor];
    if (!actorFixture) {
      throw new Error(
        `No actor fixture "${spec.actor}". Known: ${Object.keys(ACTORS).join(', ')}. ` +
        'Add one to tests/fixtures/documents.ts rather than creating a bare actor - ' +
        'a document with every characteristic at zero cannot tell a working modifier from a broken one.',
      );
    }
    const actorName = unique(`${label}-actor`);
    const actor = this.track(
      await api.createActor(this.page, {
        type: actorFixture.type,
        name: actorName,
        system: deepMerge(actorFixture.system, spec.actorOverrides ?? {}),
      }),
    );

    const ctx: Ctx = { actor, spec, actorName };
    if (!spec.item) return (this.last = ctx);

    await this.buildItem(ctx, spec, actorFixture.type);
    return (this.last = ctx);
  }

  /**
   * Create the item wherever this origin says it comes from, without putting it on the actor yet.
   * Each branch is a genuinely different code path in the system, not a stylistic choice.
   */
  private async createSource(key: string, name: string, origin: Origin,
                             system: Record<string, unknown>): Promise<Uuid> {
    const fixture = ITEMS[key];
    const spec = { type: fixture.type, name, system };

    switch (origin) {
      case 'compendium': {
        const pack = await api.ensurePack(this.page, 'qa-fixtures');
        if (!this.packs.includes(pack)) this.packs.push(pack);
        return api.createInPack(this.page, pack, spec);
      }

      case 'import': {
        if (!fixture.importId) {
          throw new Error(`Fixture "${key}" has no imported twin; use a different origin.`);
        }
        const imported = await api.findImported(this.page, fixture.pack, fixture.importId);
        if (!imported) {
          throw new Error(
            `${fixture.importId} is not in ${fixture.pack}. Is the world seeded? ` +
            'globalSetup seeds it unless SKIP_SEED is set.',
          );
        }
        // A copy, not the pack entry: dragging one out of a compendium is what a player does, and
        // anything nested into the entry itself would stay in the seed for the rest of the run.
        // The copy keeps the importer's own Active Effects, so what this origin tests is unchanged.
        return this.track(await api.copyToWorld(this.page, imported, name));
      }

      case 'in-sheet':
      case 'sidebar':
      default:
        return this.track(await api.createItem(this.page, spec));
    }
  }

  /**
   * Create nested content as a real world document, so the system builds its Active Effects.
   */
  private async createNested(
    type: string, name: string, attributes: AttributeSpec[] | undefined,
    overrides: Record<string, unknown> = {},
  ): Promise<Uuid> {
    const fixture = ITEMS[type];
    const system: Record<string, unknown> = deepMerge(fixture?.system ?? {}, overrides);
    if (attributes?.length) {
      system.attributes = {
        ...((system.attributes as Record<string, unknown>) ?? {}),
        ...attributeMap(attributes),
      };
    }

    const uuid = this.track(await api.createItem(this.page, { type, name, system }));
    await api.waitForInherentEffect(this.page, uuid);
    if (attributes?.length) {
      await api.rebuildActiveEffects(this.page, uuid);
    }

    if (system.active === false) {
      await api.setEffectsDisabled(this.page, uuid, true);
    }
    return uuid;
  }

  /** Put the prepared item onto the actor. */
  private async placeOnActor(actor: Uuid, source: Uuid,
    { itemName, actorName, actorType, itemType, origin }:
    { itemName: string; actorName: string; actorType: string; itemType: string;
      origin: Origin }): Promise<Uuid> {
    if (origin === 'in-sheet') {
      // Created straight onto the actor, which is a different path again: _onCreateAEs is gated
      // on !options.parent, so an item made this way never gets an inherent effect at all.
      const data = await api.read(this.page, source, 'system');
      await api.deleteDoc(this.page, source);
      return api.createItemOnActor(this.page, actor, {
        type: itemType, name: itemName, system: data as Record<string, unknown>,
      });
    }

    return api.embedItem(this.page, actor, source);
  }


  /**
   * The item half of a build: create it, nest anything into it, put it on the actor
   */
  async item(spec: Omit<BuildSpec, 'actor'>): Promise<Uuid> {
    World.assertKnownKeys(spec, [
      'item', 'attachment', 'modifier', 'origin', 'label',
      'attributes', 'baseMods', 'talents', 'itemOverrides',
    ], 'item spec');
    const built = await this.prepareItem(spec as BuildSpec);
    if (!built) throw new Error('item() needs an `item` in the spec.');
    return built.source;
  }

  private async buildItem(ctx: Ctx, spec: BuildSpec, actorType: string): Promise<void> {
    const built = await this.prepareItem(spec);
    if (!built) return;
    const { source, itemName, fixture, attached } = built;

    ctx.itemName = itemName;
    if (attached) ctx.attachmentIndex = 0;
    ctx.source = source;
    ctx.item = await this.placeOnActor(ctx.actor, source, {
      itemName,
      actorName: ctx.actorName,
      actorType,
      itemType: fixture.type,
      origin: spec.origin ?? 'sidebar',
    });

    if ((spec.equipped ?? true) && EQUIPPABLE.has(fixture.type)) {
      await api.setEquipped(this.page, ctx.item, true);
    }
  }

  /** The item half, shared by build() and item(). */
  private async prepareItem(spec: BuildSpec): Promise<
    { source: Uuid; itemName: string; fixture: ItemFixture; attached: boolean } | null
  > {
    if (!spec.item) return null;
    const origin = spec.origin ?? 'sidebar';
    const label = spec.label ?? 'qa';

    const fixture = ITEMS[spec.item];
    if (!fixture) {
      throw new Error(
        `No item fixture "${spec.item}". Known: ${Object.keys(ITEMS).join(', ')}. ` +
        'Add one to tests/fixtures/documents.ts rather than creating a bare item - ' +
        "schema defaults are all zero, so nothing distinguishes the item's own contribution " +
        'from the modifier under test.',
      );
    }
    const itemName = unique(`${label}-${spec.item}`);
    // Catch a bad modifier name here rather than as an unexplained zero three assertions later.
    await api.assertModifiersValid(this.page, [
      ...(spec.attributes ?? []),
      ...(spec.baseMods ?? []),
      ...(spec.talents ?? []).flatMap((t) => t.attributes),
      ...(spec.modifier ? [{ modtype: spec.modifier.modtype ?? 'Stat', mod: spec.modifier.key }] : []),
    ]);

    const system: Record<string, unknown> = deepMerge(fixture.system, spec.itemOverrides ?? {});
    if (spec.attributes?.length) {
      system.attributes = {
        ...((system.attributes as Record<string, unknown>) ?? {}),
        ...attributeMap(spec.attributes),
      };
    }
    if (spec.talents?.length) {
      // force powers and signature abilities call the same structure "upgrades"
      const field = ['forcepower', 'signatureability'].includes(fixture.type) ? 'upgrades' : 'talents';
      system[field] = talentMap(spec.talents);
    }

    const source = await this.createSource(spec.item, itemName, origin, system);

    let attachment: Uuid | undefined;
    if (typeof spec.attachment === 'string') {
      attachment = await this.createNested(
        'itemattachment', unique(`${label}-${spec.attachment}`), spec.baseMods);
    } else if (spec.attachment) {
      attachment = await this.createAttachment({
        name: `${label}-attachment`, baseMods: spec.baseMods, ...spec.attachment,
      });
    }

    if (spec.modifier) {
      const m = spec.modifier;
      const modifier = await this.createNested('itemmodifier', m.name,
        [{ modtype: m.modtype ?? 'Stat', mod: m.key, value: m.value }],
        World.modifierSystem(m));
      await api.dropOntoItem(this.page, attachment ?? source, modifier);
      await api.deleteDoc(this.page, modifier);
    }

    if (attachment) {
      await api.dropOntoItem(this.page, source, attachment);
      await api.deleteDoc(this.page, attachment);
    }

    await api.waitForInherentEffect(this.page, source);
    if (origin !== 'import' && (spec.attributes?.length || PLACEHOLDER_INHERENT.has(fixture.type))) {
      await api.rebuildActiveEffects(this.page, source);
    }
    // Talents and upgrades get their effects from the node editor instead - see the note there.
    if (origin !== 'import' && spec.talents?.length) {
      await api.applyProgressionEditors(this.page, source);
    }

    return { source, itemName, fixture, attached: Boolean(attachment) };
  }

  /**
   * Build another item and place it on the same actor, for tests about two items at once.
   */
  async addItem(ctx: Ctx, spec: Omit<BuildSpec, 'actor'>): Promise<Ctx> {
    const actorFixture = ACTORS[ctx.spec.actor];
    const next: Ctx = {
      actor: ctx.actor,
      actorName: ctx.actorName,
      spec: { ...spec, actor: ctx.spec.actor },
    };
    await this.buildItem(next, next.spec, actorFixture.type);
    return next;
  }

  /**
   * Put an already-built item on a fresh actor, and hand back a Ctx for the pair.
   */
  async place(itemUuid: Uuid, spec: {
    actor: string;
    equipped?: boolean;
    drag?: boolean;
    label?: string;
    actorOverrides?: Record<string, unknown>;
  }): Promise<Ctx> {
    const actorFixture = ACTORS[spec.actor];
    if (!actorFixture) {
      throw new Error(`No actor fixture "${spec.actor}". Known: ${Object.keys(ACTORS).join(', ')}.`);
    }
    const actorName = unique(`${spec.label ?? 'qa'}-actor`);
    const actor = this.track(await api.createActor(this.page, {
      type: actorFixture.type,
      name: actorName,
      system: deepMerge(actorFixture.system, spec.actorOverrides ?? {}),
    }));

    const itemName = String(await api.read(this.page, itemUuid, 'name') ?? '');
    const type = String(await api.read(this.page, itemUuid, 'type') ?? '');

    const ctx: Ctx = {
      actor,
      actorName,
      itemName,
      source: itemUuid,
      spec: { actor: spec.actor, equipped: spec.equipped },
      item: spec.drag
        ? await api.dropOnActorSheet(this.page, actor, itemUuid)
        : await api.embedItem(this.page, actor, itemUuid),
    };
    if (await api.read(this.page, ctx.item!, 'system.itemattachment.0')) ctx.attachmentIndex = 0;

    if ((spec.equipped ?? true) && EQUIPPABLE.has(type)) {
      await api.setEquipped(this.page, ctx.item!, true);
    }
    return (this.last = ctx);
  }

  /** Equip or unequip the built item. */
  async equip(ctx: Ctx, equipped: boolean): Promise<void> {
    if (!ctx.item) throw new Error('Nothing to equip - the build had no item.');
    await api.setEquipped(this.page, ctx.item, equipped);
  }

  /**
   * Learn or unlearn one of the built item's talent / upgrade nodes, by its position in `talents`.
   */
  async learn(ctx: Ctx, index: number, learned = true): Promise<void> {
    if (!ctx?.item) throw new Error('learn() needs a build that reached an item.');
    await api.setLearned(this.page, ctx.item, String(index), learned);
  }

  /**
   * Build an attachment and drop it onto the item, through the sheet's own drop handler.
   */
  async attach(ctx: Ctx = this.last!, spec: AttachmentSpec = {}): Promise<number> {
    const refusal = await this.tryAttach(ctx, spec);
    if (refusal) throw new Error(`The sheet refused the attachment: ${refusal}`);
    const attachments = (await api.read(this.page, ctx.item!, 'system.itemattachment')) as unknown[] | null;
    const index = (attachments?.length ?? 0) - 1;
    ctx.attachmentIndex ??= index;
    return index;
  }

  /**
   * The same, for tests where the refusal is the point. Returns null when it was accepted.
   */
  async tryAttach(ctx: Ctx = this.last!, spec: AttachmentSpec = {}): Promise<string | null> {
    if (!ctx?.item) throw new Error('attach() needs a build that reached an item.');
    const attachment = await this.createAttachment(spec);
    const refusal = await api.tryDropOntoItem(this.page, ctx.item, attachment);
    // The embedded copy is independent of the document it came from, exactly as in build().
    await api.deleteDoc(this.page, attachment);
    return refusal;
  }

  /**
   * Create a named modifier and drop it onto the item itself - a quality on the carrier, D2.
   */
  async addModifier(ctx: Ctx, spec: ModifierSpec): Promise<void> {
    if (!ctx?.item) throw new Error('addModifier() needs a build that reached an item.');
    const modifier = await this.createNested('itemmodifier', spec.name,
      [{ modtype: spec.modtype ?? 'Stat', mod: spec.key, value: spec.value }],
      World.modifierSystem(spec));
    await api.dropOntoItem(this.page, ctx.item, modifier);
    await api.deleteDoc(this.page, modifier);
  }

  /**
   * Refuse a spec key we do not read.
   */
  private static assertKnownKeys(spec: object, known: string[], what: string): void {
    const unknown = Object.keys(spec).filter((k) => !known.includes(k));
    if (unknown.length) {
      throw new Error(
        `Unknown ${what} field(s): ${unknown.join(', ')}. Known: ${known.join(', ')}.`,
      );
    }
  }

  /** A standalone attachment document, with its own modifiers already nested inside it. */
  private async createAttachment(spec: AttachmentSpec): Promise<Uuid> {
    World.assertKnownKeys(spec,
      ['name', 'type', 'hardpoints', 'baseMods', 'modifications'], 'attachment spec');
    const overrides: Record<string, unknown> = {};
    if (spec.type) overrides.type = spec.type;
    if (spec.hardpoints !== undefined) {
      overrides.hardpoints = { value: spec.hardpoints, adjusted: spec.hardpoints };
    }

    const attachment = await this.createNested(
      'itemattachment', unique(spec.name ?? 'qa-attachment'), spec.baseMods, overrides);

    for (const m of spec.modifications ?? []) {
      const modifier = await this.createNested('itemmodifier', m.name,
        [{ modtype: m.modtype ?? 'Stat', mod: m.key, value: m.value }],
        World.modifierSystem({ ...m, active: m.installed }));
      await api.dropOntoItem(this.page, attachment, modifier);
      await api.deleteDoc(this.page, modifier);
    }
    return attachment;
  }

  /**
   * Take the attachment back off the item, the way the sheet's delete control does.
   */
  async removeAttachment(ctx: Ctx = this.last!, index = ctx.attachmentIndex ?? 0): Promise<void> {
    if (!ctx?.item) throw new Error('removeAttachment() needs a build that reached an item.');
    await api.removeEmbedded(this.page, ctx.item, 'itemattachment', index);
  }

  /**
   * Drag a talent item onto one of the specialization's tree nodes.
   */
  async dropTalent(
    ctx: Ctx, nodeKey: string,
    talent: { name: string; ranked?: boolean; attributes?: AttributeSpec[] },
  ): Promise<Uuid> {
    if (!ctx?.item) throw new Error('dropTalent() needs a build that reached a specialization.');
    const source = await this.createNested('talent', unique(talent.name), talent.attributes, {
      ranks: { ranked: talent.ranked ?? false, current: 1 },
      // The fixture stores this as "", but the schema and the drop handler both want an array -
      // `trees.push()` on a string throws.
      trees: [],
    });
    await api.dropTalentOntoSpecialization(this.page, ctx.item, source, nodeKey);
    return source;
  }

  /**
   * Clear a talent / upgrade node's modifiers, by its position in `talents`.
   */
  async clearTalent(ctx: Ctx, index: number): Promise<void> {
    if (!ctx?.item) throw new Error('clearTalent() needs a build that reached an item.');
    await api.clearProgressionNode(this.page, ctx.item, String(index));
  }

  /**
   * Install one of an attachment's Modifications, or uninstall it.
   */
  async setModificationInstalled(
    ctx: Ctx, modificationIndex: number, installed: boolean,
    attachmentIndex = ctx.attachmentIndex ?? 0,
  ): Promise<void> {
    if (!ctx?.item) throw new Error('setModificationInstalled() needs a build that reached an item.');
    await api.setModificationInstalled(
      this.page, ctx.item, attachmentIndex, modificationIndex, installed);
  }

  /** Take a quality off the item. Only qualities added to the item itself can be removed. */
  async removeModifier(ctx: Ctx = this.last!, index = 0): Promise<void> {
    if (!ctx?.item) throw new Error('removeModifier() needs a build that reached an item.');
    await api.removeEmbedded(this.page, ctx.item, 'itemmodifier', index);
  }

  /**
   * Repeat the last build's innermost placement against the same target.
   *
   * Goes through the drop handler like the original placement did, so a second application is
   * the same operation the system saw the first time.
   */
  async applyAgain(ctx: Ctx = this.last!): Promise<void> {
    if (!ctx?.item) throw new Error('applyAgain() needs a build that reached at least an item.');
    const { modifier, attachment, baseMods, label = 'qa' } = ctx.spec;

    if (modifier) {
      const again = await this.createNested('itemmodifier', modifier.name,
        [{ modtype: modifier.modtype ?? 'Stat', mod: modifier.key, value: modifier.value }],
        World.modifierSystem(modifier));
      await api.dropOntoItem(this.page, ctx.item, again);
      await api.deleteDoc(this.page, again);
    } else if (attachment) {
      const again = typeof attachment === 'string'
        ? await this.createNested(
            'itemattachment', unique(`${label}-${attachment}`), baseMods)
        : await this.createAttachment({
            name: `${label}-attachment`, baseMods, ...attachment,
          });
      await api.dropOntoItem(this.page, ctx.item, again);
      await api.deleteDoc(this.page, again);
    } else if (ctx.spec.attributes?.length) {
      // D1: nothing is nested, so the repeat is re-submitting the item's own modifier rows -
      // which is what #1976 describes, soak climbing on every edit of an unrelated field.
      await api.update(this.page, ctx.item, {
        'system.attributes': attributeMap(ctx.spec.attributes),
      });
      await api.rebuildActiveEffects(this.page, ctx.item);
    } else {
      throw new Error(
        'Nothing to re-apply: the build had no attributes, attachment or modifier.',
      );
    }
  }

  /** Reload the page and wait for the system to come back. */
  async reload(): Promise<void> {
    await this.page.reload();
    await this.page.waitForFunction(() => game?.ready === true, undefined, { timeout: 60_000 });
    await this.assertReady();
  }

  /**
   * The same fixture built both ways (in Foundry and imported), for comparing them.
   */
  async buildBothWays(spec: BuildSpec): Promise<{ created: Ctx; imported: Ctx }> {
    return {
      created: await this.build({ ...spec, origin: 'sidebar', label: `${spec.label ?? 'qa'}-made` }),
      imported: await this.build({ ...spec, origin: 'import', label: `${spec.label ?? 'qa'}-imported` }),
    };
  }

  /** Remove everything this test created. Safe to call twice. */
  async teardown(): Promise<void> {
    for (const uuid of this.created) await api.deleteDoc(this.page, uuid);
    this.created.length = 0;
    for (const pack of this.packs) await api.deletePack(this.page, pack);
    this.packs.length = 0;
    this.last = undefined;
  }
}
