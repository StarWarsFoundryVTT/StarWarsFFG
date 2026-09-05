import type { Page } from '@playwright/test';
import * as api from './api';
import type { Uuid } from './api';
import { ITEMS, ACTORS, attachmentFixture, modifierFixture, type ModifierSpec } from '../fixtures/documents';

export type { ModifierSpec };

/**
 * Builds nested content, repeats actions, reloads, and cleans up.
 */

/** How deep the built content goes. */
export type Depth = 1 | 2 | 3;

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
  attachment?: string;
  modifier?: ModifierSpec;
  origin?: Origin;
  /** Armour and weapons only contribute while equipped. Defaults to true when an item is present. */
  equipped?: boolean;
  /** Name prefix, for readability in traces. A unique suffix is always appended. */
  label?: string;
  /** Per-test tweaks merged over the item fixture's system data. */
  itemOverrides?: Record<string, unknown>;
  /** Per-test tweaks merged over the actor fixture's system data. */
  actorOverrides?: Record<string, unknown>;
}

export interface Ctx {
  actor: Uuid;
  item?: Uuid;
  /** Index of the attachment within `item.system.itemattachment`, since it has no id. */
  attachmentIndex?: number;
  spec: BuildSpec;
  depth: Depth;
}

/** Unique per build, so a failed test can't collide with the next one. */
let seq = 0;
const unique = (base: string) => `${base}-${process.pid.toString(36)}-${(seq++).toString(36)}`;

export class World {
  constructor(private readonly page: Page) {}

  /** Documents to remove after the test, newest first. */
  private readonly created: Uuid[] = [];
  private readonly packs: string[] = [];
  /** Kept so `applyAgain()` can repeat what `build()` did. */
  private last?: Ctx;

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
   * Build content to the requested depth in one call.
   * Depth comes from which fields are set: item is D1, + attachment is D2, + modifier is D3.
   */
  async build(spec: BuildSpec): Promise<Ctx> {
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
    const actor = this.track(
      await api.createActor(this.page, {
        type: actorFixture.type,
        name: unique(`${label}-actor`),
        system: { ...actorFixture.system, ...(spec.actorOverrides ?? {}) },
      }),
    );

    const ctx: Ctx = { actor, spec, depth: 1 };
    if (!spec.item) return (this.last = ctx);

    const itemName = unique(`${label}-${spec.item}`);
    ctx.item = await this.placeItem(actor, spec.item, itemName, origin, spec.itemOverrides);

    if (spec.equipped ?? true) {
      await api.setEquipped(this.page, ctx.item, true);
    }

    if (spec.attachment) {
      await api.pushNested(this.page, ctx.item, 'system.itemattachment',
        attachmentFixture(unique(`${label}-${spec.attachment}`)));
      ctx.attachmentIndex = 0;
      ctx.depth = 2;
    }

    if (spec.modifier) {
      if (ctx.attachmentIndex === undefined) {
        // modifier directly on the item
        await api.pushNested(this.page, ctx.item, 'system.itemmodifier', modifierFixture(spec.modifier));
        ctx.depth = 2;
      } else {
        // modifier inside the attachment - the deepest level anything traverses
        await api.pushNestedDeep(this.page, ctx.item, 'system.itemattachment', ctx.attachmentIndex,
          'system.itemmodifier', modifierFixture(spec.modifier));
        ctx.depth = 3;
      }
    }

    return (this.last = ctx);
  }

  /** Create the item by the requested route and return its UUID on the actor. */
  private async placeItem(actor: Uuid, key: string, name: string, origin: Origin,
                          overrides?: Record<string, unknown>): Promise<Uuid> {
    const fixture = ITEMS[key];
    if (!fixture) {
      throw new Error(
        `No item fixture "${key}". Known: ${Object.keys(ITEMS).join(', ')}. ` +
        'Add one to tests/fixtures/documents.ts rather than creating a bare item - ' +
        'schema defaults are all zero, so nothing distinguishes the item\'s own contribution ' +
        'from the modifier under test.',
      );
    }
    const spec = { type: fixture.type, name, system: { ...fixture.system, ...(overrides ?? {}) } };

    switch (origin) {
      case 'in-sheet':
        return api.createItemOnActor(this.page, actor, spec);

      case 'compendium': {
        const pack = await api.ensurePack(this.page, 'qa-fixtures');
        if (!this.packs.includes(pack)) this.packs.push(pack);
        const inPack = await api.createInPack(this.page, pack, spec);
        return api.embedItem(this.page, actor, inPack);
      }

      case 'import': {
        // Seeded content, not created here. Resolving it is deliberately left to the seed world so
        // that importer runtime never lands inside a test.
        throw new Error(
          "origin 'import' must resolve against the seeded world; " +
          'look the fixture up by name in tests/fixtures/world-seed rather than building it.',
        );
      }

      case 'sidebar':
      default: {
        const world = this.track(await api.createItem(this.page, spec));
        return api.embedItem(this.page, actor, world);
      }
    }
  }

  /** Repeat the last build's innermost placement against the same target. */
  async applyAgain(ctx: Ctx = this.last!): Promise<void> {
    if (!ctx?.item) throw new Error('applyAgain() needs a build that reached at least an item.');
    const { modifier, attachment, label = 'qa' } = ctx.spec;

    if (modifier && ctx.attachmentIndex !== undefined) {
      await api.pushNestedDeep(this.page, ctx.item, 'system.itemattachment', ctx.attachmentIndex,
        'system.itemmodifier', modifierFixture(modifier));
    } else if (modifier) {
      await api.pushNested(this.page, ctx.item, 'system.itemmodifier', modifierFixture(modifier));
    } else if (attachment) {
      await api.pushNested(this.page, ctx.item, 'system.itemattachment',
        attachmentFixture(unique(`${label}-${attachment}`)));
    } else {
      throw new Error('Nothing to re-apply: the build had neither an attachment nor a modifier.');
    }
  }

  /** Reload the page and wait for the system to come back. */
  async reload(): Promise<void> {
    await this.page.reload();
    await this.page.waitForFunction(() => game?.ready === true, undefined, { timeout: 60_000 });
    await this.assertReady();
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
