import type { Page } from '@playwright/test';
import * as api from './api';
import type { Ctx } from './world';
import { sheetStat } from './pages/actor-sheet';

/**
 * Reads the four places a modifier is supposed to show up.
 *
 * They don't traverse nesting the same way, so they can disagree - which is the bug
 * #2191 describes. Reading all four at once says which one is wrong.
 */

export interface Reading {
  /** `actor.system.stats.*` */
  actorStat: number | null;
  /** `item.system.<stat>.adjusted` */
  itemAdjusted: number | null;
  /** Pool the system would build for a roll with this item. */
  poolDice: PoolSummary | null;
  /** Whether the modifier appears in the rendered chat card. */
  chatCard: boolean | null;
}

export interface PoolSummary {
  ability: number; proficiency: number; boost: number;
  setback: number; difficulty: number; challenge: number; force: number;
}

/**
 * Where each modifier key lands. Spelled out rather than read from
 * `ModifierHelpers.getModKeyPath`, so the probe doesn't depend on the code it's testing.
 */
const ACTOR_PATH: Record<string, string> = {
  // character stats
  'Soak': 'system.stats.soak.value',
  'Defence-Ranged': 'system.stats.defence.ranged',
  'Defence-Melee': 'system.stats.defence.melee',
  'Encumbrance': 'system.stats.encumbrance.value',
  'EncumbranceMax': 'system.stats.encumbrance.max',
  'Wounds': 'system.stats.wounds.max',
  'Strain': 'system.stats.strain.max',
  'ForcePool': 'system.stats.forcePool.max',
  // characteristics
  'Brawn': 'system.characteristics.Brawn.value',
  'Agility': 'system.characteristics.Agility.value',
  'Intellect': 'system.characteristics.Intellect.value',
  'Cunning': 'system.characteristics.Cunning.value',
  'Willpower': 'system.characteristics.Willpower.value',
  'Presence': 'system.characteristics.Presence.value',
  // vehicles
  'Armor': 'system.stats.armour.value',
  'Armour': 'system.stats.armour.value',
  'Speed': 'system.stats.speed.max',
  'Handling': 'system.stats.handling.value',
  'Hulltrauma': 'system.stats.hullTrauma.max',
  'Systemstrain': 'system.stats.systemStrain.max',
  'CustomizationHardPoints': 'system.stats.customizationHardPoints.value',
  'VehicleEncumbrance': 'system.stats.encumbrance.value',
};

/**
 * Where a skill modifier lands.
 */
const SKILL_MOD_PATH: Record<string, string> = {
  'Advantage': 'advantage',
  'Success': 'success',
  'Threat': 'threat',
  'Failure': 'failure',
  'Triumph': 'triumph',
  'Despair': 'despair',
  'Boost': 'boost',
  'Setback': 'setback',
  'Remove Setback': 'remsetback',
  'Upgrade': 'upgrades',
  'Rank': 'rank',
};

const ITEM_PATH: Record<string, string> = {
  'Soak': 'system.soak.adjusted',
  'Defence-Ranged': 'system.defence.adjusted',
  'Defence-Melee': 'system.defence.adjusted',
  'Encumbrance': 'system.encumbrance.adjusted',
  'Damage': 'system.damage.adjusted',
  'Crit': 'system.crit.adjusted',
  'HP': 'system.hardpoints.adjusted',
  'Range': 'system.range.adjusted',
};

export class Consumers {
  constructor(private readonly page: Page) {}

  /**
   * Compare a world-created item against its imported twin.
   *
   * Returns only unexpected differences
   */
  async compareOrigins(
    created: Ctx,
    imported: Ctx,
    { includeExpected = false } = {},
  ): Promise<string[]> {
    if (!created.item || !imported.item) throw new Error('Both contexts need an item.');

    const [a, b] = await Promise.all([
      api.flatten(this.page, created.item),
      api.flatten(this.page, imported.item),
    ]);

    const diffs: string[] = [];
    for (const path of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
      if (JSON.stringify(a[path]) === JSON.stringify(b[path])) continue;
      const why = expectedDifference(path);
      if (why && !includeExpected) continue;
      const tag = why ? ` [expected: ${why}]` : '';
      diffs.push(`${path}: created=${JSON.stringify(a[path])} imported=${JSON.stringify(b[path])}${tag}`);
    }
    return diffs;
  }

  /** Read every consumer for one modifier key. Missing readers return null, not zero. */
  async read(ctx: Ctx, key: string): Promise<Reading> {
    return {
      actorStat: await this.actorStat(ctx, key),
      itemAdjusted: await this.itemAdjusted(ctx, key),
      poolDice: await this.poolDice(ctx),
      chatCard: await this.chatCard(ctx, key),
    };
  }

  /** A skill's rank, or one of the dice modifiers stacked onto it. */
  async skillModifier(ctx: Ctx, skill: string, kind: string): Promise<number | null> {
    const field = SKILL_MOD_PATH[kind];
    if (!field) throw new Error(`Unknown skill modifier "${kind}". Known: ${Object.keys(SKILL_MOD_PATH).join(', ')}.`);
    const raw = await api.read(this.page, ctx.actor, `system.skills.${skill}.${field}`);
    return raw === null ? null : Number(raw);
  }

  /**
   * An actor stat, read from the document where it exists and from the sheet where it does not.
   *
   * The document is preferred because it is never stale. A rendered sheet lags: Foundry re-renders
   * asynchronously after an item's effects change, so a one-shot DOM read can catch the previous
   * render and report a value that was correct a moment ago. Unequipping armour shows this
   * clearly - the document reports 0 while the sheet still shows 1.
   *
   * The sheet remains the fallback because some values never reach the document at all. Talent-tree
   * modifiers are computed by `getCalculatedValueFromItems` during render and stored nowhere, so
   * for those the sheet is the only surface - and `actorStat` correctly returns null rather than 0,
   * which is what makes the fallback safe.
   */
  async stat(ctx: Ctx, key: string): Promise<number | null> {
    const stored = await this.actorStat(ctx, key);
    if (stored !== null) return stored;

    await api.openSheet(this.page, ctx.actor);
    return sheetStat(this.page, ctx.actorName, key);
  }

  /** The same stat as stored on the document, for comparing against what the sheet shows. */
  async storedStat(ctx: Ctx, key: string): Promise<number | null> {
    return this.actorStat(ctx, key);
  }

  /** The recursive path, via `helpers/modifiers.js`. */
  async actorStat(ctx: Ctx, key: string): Promise<number | null> {
    const path = ACTOR_PATH[key];
    if (!path) return null;
    const raw = await api.read(this.page, ctx.actor, path);
    return raw === null ? null : Number(raw);
  }

  /** The flat path, via `item-ffg.js`'s `adjusted*` build. */
  async itemAdjusted(ctx: Ctx, key: string): Promise<number | null> {
    const path = ITEM_PATH[key];
    if (!path || !ctx.item) return null;
    const raw = await api.read(this.page, ctx.item, path);
    return raw === null ? null : Number(raw);
  }

  /** The dice pool the system would assemble, stopping short of rolling it. */
  async poolDice(ctx: Ctx): Promise<PoolSummary | null> {
    if (!ctx.item) return null;
    return this.page.evaluate(async (itemUuid) => {
      const item = await fromUuid(itemUuid);
      if (!item) return null;
      // window.DicePoolFFG is exported by the system on init (swffg-main.js)
      const pool = new window.DicePoolFFG({});
      const merged = await game.ffg.DiceHelpers.getModifiers(pool, item);
      const p = new window.DicePoolFFG(merged);
      return {
        ability: Number(p.ability) || 0,
        proficiency: Number(p.proficiency) || 0,
        boost: Number(p.boost) || 0,
        setback: Number(p.setback) || 0,
        difficulty: Number(p.difficulty) || 0,
        challenge: Number(p.challenge) || 0,
        force: Number(p.force) || 0,
      };
    }, ctx.item);
  }

  /**
   * Whether a named modifier appears on the item's send-to-chat card.
   *
   * Drives the system's own entry point - `ActorSheetFFG._itemDetailsToChat(itemId)` - rather than
   * assembling a message. That builds the card through `getItemDetails()`, which renders qualities
   * as pills carrying `data-item-embed-name="<modifier name>"`, so the modifier's name is the
   * thing to look for.
   *
   * Only meaningful for a *named* nested modifier. Attributes written straight onto an item or an
   * attachment are not qualities and never appear as pills, so this returns null for them - which
   * the coherence check reads as "not applicable" rather than a disagreement.
   *
   * The message is deleted afterwards, so nothing leaks into the next test.
   */
  async chatCard(ctx: Ctx, _key: string): Promise<boolean | null> {
    const needle = ctx.spec.modifier?.name;
    if (!ctx.item || !needle) return null;

    return this.page.evaluate(async ({ actorUuid, itemUuid, needle }) => {
      const actor = await fromUuid(actorUuid);
      const item = await fromUuid(itemUuid);
      if (!actor || !item) return null;

      const before = new Set(game.messages.contents.map((m: any) => m.id));
      await actor.sheet._itemDetailsToChat(item.id);

      // the card is created asynchronously by the handler
      let created: any = null;
      for (let i = 0; i < 60 && !created; i++) {
        created = game.messages.contents.find((m: any) => !before.has(m.id));
        if (!created) await new Promise((r) => setTimeout(r, 25));
      }
      if (!created) return null;

      try {
        return (created.content ?? '').includes(needle);
      } finally {
        await created.delete();
      }
    }, { actorUuid: ctx.actor, itemUuid: ctx.item, needle });
  }




}

/**
 * Paths that legitimately differ between a world-created item and its imported twin.
 */
const EXPECTED_DIFFERENCES: { pattern: RegExp; why: string }[] = [
  // Foundry document identity. Different documents, so of course these differ.
  { pattern: /^(_id|name|sort|folder|_stats|ownership|effects)(\.|$)/, why: 'document identity' },

  // `prepareBaseObject` stamps ffgimportid; Foundry stamps core.sourceId on compendium import.
  { pattern: /^flags\./, why: 'import provenance' },

  // Importers set an image per type, or pull one out of the dataset zip.
  { pattern: /^img$/, why: 'importer sets a type-specific image' },

  // `cleanDescription` rewrites the dataset's [H3]/[B] markup and appends the BaseMods summary.
  { pattern: /^system\.(description|renderedDesc)$/, why: 'description is rebuilt from XML' },

  // Tags come from the entry's <Categories> and <Type>; sources come from <Sources>.
  { pattern: /^system\.metadata\./, why: 'metadata is derived from the dataset' },
];

function expectedDifference(path: string): string | null {
  return EXPECTED_DIFFERENCES.find((e) => e.pattern.test(path))?.why ?? null;
}

/**
 * Do the readers agree that a change of `delta` happened?
 *
 * Each reader is compared against its own baseline - they measure different things, so only
 * the movement is comparable. Readers that are null in both readings are skipped.
 */
export function divergence(before: Reading, after: Reading, delta: number): string[] {
  const problems: string[] = [];

  const num = (name: keyof Reading, b: unknown, a: unknown) => {
    if (b === null && a === null) return;
    if (b === null || a === null) {
      problems.push(`${name}: reader became ${b === null ? 'available' : 'unavailable'} between readings`);
      return;
    }
    const moved = Number(a) - Number(b);
    if (moved !== delta) {
      problems.push(`${name}: expected to move by ${delta}, moved by ${moved} (${b} -> ${a})`);
    }
  };

  num('actorStat', before.actorStat, after.actorStat);
  num('itemAdjusted', before.itemAdjusted, after.itemAdjusted);

  if (before.chatCard !== null && after.chatCard !== null && before.chatCard === after.chatCard) {
    problems.push(`chatCard: modifier ${after.chatCard ? 'was already' : 'is still not'} present in the card`);
  }

  return problems;
}
